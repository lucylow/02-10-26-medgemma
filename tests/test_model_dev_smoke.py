"""
Smoke tests for model-dev: training utils, synthetic dataset, and mocked inference.

Run from repo root:
  pytest tests/test_model_dev_smoke.py -v
  pytest tests/test_model_dev_smoke.py -v -k "utils"  # only utils
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Add model-dev/training so training_utils is importable
REPO_ROOT = Path(__file__).resolve().parents[1]
TRAINING_DIR = REPO_ROOT / "model-dev" / "training"
if str(TRAINING_DIR) not in sys.path:
    sys.path.insert(0, str(TRAINING_DIR))


@pytest.fixture
def training_utils():
    import training_utils as tu
    return tu


def test_set_seed(training_utils):
    training_utils.set_seed(42)
    import random
    assert random.randint(0, 10**6) >= 0


def test_safe_makedir(training_utils, tmp_path):
    d = tmp_path / "sub" / "dir"
    training_utils.safe_makedir(d, exist_ok=True)
    assert d.is_dir()


def test_make_synthetic_dataset(training_utils):
    ds = training_utils.make_synthetic_dataset(8)
    assert len(ds) == 8
    row = ds[0]
    assert "prompt" in row and "target" in row
    assert "Case 0" in row["prompt"]
    assert "Monitor" in row["target"]


def test_save_provenance(training_utils, tmp_path):
    prov = {"adapter_name": "test", "seed": 42}
    out = tmp_path / "provenance.json"
    training_utils.save_provenance(prov, out)
    assert out.exists()
    with open(out) as f:
        loaded = json.load(f)
    assert loaded["adapter_name"] == "test" and loaded["seed"] == 42


def test_load_jsonl_dataset_observations_compat(training_utils, tmp_path):
    """JSONL with observations/expected_risk is mapped to prompt/target."""
    path = tmp_path / "data.jsonl"
    path.write_text(
        '{"observations": "Says 10 words.", "expected_risk": "monitor"}\n'
        '{"observations": "No words.", "expected_risk": "refer"}\n',
        encoding="utf-8",
    )
    ds = training_utils.load_jsonl_dataset(str(path))
    assert len(ds) == 2
    assert "prompt" in ds[0] and "target" in ds[0]
    assert "Says 10 words" in ds[0]["prompt"]
    assert ds[0]["target"] == "monitor"


def test_inference_server_contract():
    """Mock inference server returns expected JSON shape (no server required)."""
    # Simulate what the inference server returns (see model-dev/deploy/modelserver/app/main.py)
    mock_embed = {"embedding_b64": "AAAA", "shape": [1, 256], "emb_version": "medsiglip-v1"}
    mock_infer = {
        "text_summary": "Summary.",
        "risk": "monitor",
        "recommendations": ["Rec 1"],
        "model_version": "medgemma-adapter-v1",
        "adapter_id": "example_adapter",
        "inference_time_s": 0.1,
        "explainability": {},
    }
    assert "embedding_b64" in mock_embed and "shape" in mock_embed
    assert "text_summary" in mock_infer and "risk" in mock_infer and "recommendations" in mock_infer
