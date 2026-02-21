"""
Smoke test: one training step on tiny synthetic dataset (Page 5 acceptance).

Run with: pytest tests/test_training_small.py -v
Requires: GPU for full run, or set PEDISCREEN_SKIP_HEAVY=1 to skip trainer test.
"""
import json
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def test_jsonl_text_dataset(tmp_path):
    """Test that JsonlTextDataset builds 'text' from observations + label."""
    from training.utils import JsonlTextDataset

    j = tmp_path / "tiny.jsonl"
    j.write_text(
        '{"case_id": "1", "age_months": 24, "observations": "Some obs.", "label": "monitor"}\n'
        '{"case_id": "2", "age_months": 36, "observations": "Other obs.", "expected_risk": "on_track"}\n'
    )
    ds = JsonlTextDataset(j)
    assert len(ds) == 2
    assert "text" in ds.samples[0]
    assert "observations" in ds.samples[0]["text"] or "Observations" in ds.samples[0]["text"]
    assert "monitor" in ds.samples[1]["text"] or "on_track" in ds.samples[1]["text"]


def test_collate_causal_lm():
    """Test collate produces input_ids and labels with -100 for padding."""
    from transformers import AutoTokenizer
    from training.utils import collate_causal_lm

    try:
        tok = AutoTokenizer.from_pretrained("google/gemma-2b-it", trust_remote_code=True)
    except Exception:
        try:
            tok = AutoTokenizer.from_pretrained("bert-base-uncased")
            if tok.pad_token_id is None:
                tok.pad_token_id = tok.eos_token_id
        except Exception:
            pytest.skip("tokenizer not available")
    collate = collate_causal_lm(tok, max_length=64)
    batch = [
        {"text": "Hello world."},
        {"text": "Short."},
    ]
    out = collate(batch)
    assert "input_ids" in out
    assert "labels" in out
    assert out["labels"].shape == out["input_ids"].shape
    pad_id = tok.pad_token_id or tok.eos_token_id
    if pad_id is not None:
        mask = out["input_ids"] == pad_id
        assert (out["labels"][mask] == -100).all()


@pytest.mark.skipif(
    os.environ.get("PEDISCREEN_SKIP_HEAVY") == "1",
    reason="Set PEDISCREEN_SKIP_HEAVY=0 to run GPU smoke test",
)
def test_finetune_one_step(tmp_path):
    """Run one training step (requires GPU + model). Skip in CI with PEDISCREEN_SKIP_HEAVY=1."""
    import subprocess

    j = tmp_path / "train.jsonl"
    lines = [
        json.dumps({
            "case_id": f"c{i}",
            "age_months": 24,
            "observations": "Synthetic observation text for smoke test.",
            "label": "monitor",
        })
        for i in range(4)
    ]
    j.write_text("\n".join(lines))
    out_dir = tmp_path / "adapters" / "test"
    cmd = [
        sys.executable,
        "-m",
        "training.finetune_lora",
        "--model_name_or_path",
        "google/medgemma-2b-it",
        "--train_file",
        str(j),
        "--output_dir",
        str(out_dir),
        "--adapter-dir",
        str(out_dir),
        "--num_train_epochs",
        "1",
        "--max-length",
        "64",
        "--per_device_train_batch_size",
        "2",
        "--max_steps",
        "1",
    ]
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=600)
    if "Could not find" in (result.stderr or "") or "401" in (result.stderr or ""):
        pytest.skip("Base model not accessible")
    assert result.returncode == 0, (result.stdout, result.stderr)
    assert (out_dir / "adapter_config.json").exists() or (out_dir / "config.json").exists() or "Adapter saved" in (result.stdout or "")
