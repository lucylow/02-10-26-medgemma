"""Smoke tests for eval scripts (runbook Page 16)."""
import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent


def test_evaluate_model_produces_json():
    """eval/evaluate_model.py produces valid JSON output."""
    out_path = REPO_ROOT / "eval" / "results_smoke.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    manifest = REPO_ROOT / "data" / "manifests" / "test.jsonl"
    if not manifest.exists():
        pytest.skip("data/manifests/test.jsonl not found")
    result = subprocess.run(
        [
            sys.executable,
            str(REPO_ROOT / "eval" / "evaluate_model.py"),
            "--manifest", str(manifest),
            "--out", str(out_path),
        ],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr or result.stdout
    assert out_path.exists()
    with open(out_path) as f:
        data = json.load(f)
    assert "sensitivity" in data
    assert "specificity" in data
    assert "n_samples" in data


def test_embedding_checks_produces_json():
    """eval/embedding_checks.py produces valid JSON output."""
    out_path = REPO_ROOT / "eval" / "embedding_checks_smoke.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            sys.executable,
            str(REPO_ROOT / "eval" / "embedding_checks.py"),
            "--out", str(out_path),
        ],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr or result.stdout
    assert out_path.exists()
    with open(out_path) as f:
        data = json.load(f)
    assert "stability" in data
    assert "discriminativity" in data
