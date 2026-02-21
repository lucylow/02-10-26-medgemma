"""
Tests for eval suite (Page 7 acceptance): report.json has expected keys and artifacts.
"""
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def test_classification_metrics():
    from eval.metrics import classification_metrics

    y_true = ["refer", "monitor", "refer", "on_track"]
    y_pred = ["refer", "monitor", "monitor", "on_track"]
    m = classification_metrics(y_true, y_pred, positive_label="refer")
    assert "sensitivity" in m
    assert "specificity" in m
    assert "ppv" in m
    assert "npv" in m
    assert "accuracy" in m
    assert "confusion_matrix" in m
    assert "f1_macro" in m


def test_evaluate_produces_report(tmp_path):
    eval_path = tmp_path / "eval.jsonl"
    eval_path.write_text(
        '{"case_id": "1", "observations": "a", "expected_risk": "refer"}\n'
        '{"case_id": "2", "observations": "b", "expected_risk": "monitor"}\n'
    )
    report_path = tmp_path / "report.json"
    import subprocess
    r = subprocess.run(
        [
            sys.executable, "-m", "eval.evaluate",
            "--eval_file", str(eval_path),
            "--report_path", str(report_path),
            "--artifacts_dir", str(tmp_path / "artifacts"),
            "--mock",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert r.returncode == 0, (r.stdout, r.stderr)
    with open(report_path) as f:
        report = json.load(f)
    assert "metrics" in report
    assert "artifacts" in report
    assert "sensitivity" in report["metrics"]
    assert "accuracy" in report["metrics"]
    assert "latency" in report["metrics"]
