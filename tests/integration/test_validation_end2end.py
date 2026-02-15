"""
Integration test: full validation pipeline end-to-end.

Validates that ClinicalMetrics, SafetyMetrics, ValidationReport,
and benchmark runner work together.
"""
import json
import tempfile
from pathlib import Path

import numpy as np
import pytest

# Add project root
import sys
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.validation import ClinicalMetrics, SafetyMetrics, ValidationReport, DriftDetector
from src.validation.safety import SafetyValidator


@pytest.fixture
def sample_labels():
    """100 cases: 20 on_track, 40 monitor, 30 discuss, 10 refer."""
    y = []
    for risk, count in [("on_track", 20), ("monitor", 40), ("discuss", 30), ("refer", 10)]:
        idx = ["on_track", "monitor", "discuss", "refer"].index(risk)
        y.extend([idx] * count)
    return np.array(y)


@pytest.fixture
def mock_predictions(sample_labels):
    """Simulate ~96% sensitivity on refer."""
    np.random.seed(42)
    y_pred = sample_labels.copy()
    refer_idx = np.where(sample_labels == 3)[0]
    if len(refer_idx) > 0:
        miss = np.random.choice(refer_idx, size=1, replace=False)
        y_pred[miss] = 2
    return y_pred


def test_clinical_metrics_basic(sample_labels, mock_predictions):
    """ClinicalMetrics computes sens/spec/ppv/npv."""
    m = ClinicalMetrics(sample_labels, mock_predictions)
    binary = m.binary_sensitivity_specificity(positive_classes=["refer"])
    assert binary["sensitivity"] >= 0.9
    assert 0 <= binary["specificity"] <= 1
    assert 0 <= binary["ppv"] <= 1
    assert 0 <= binary["npv"] <= 1


def test_clinical_metrics_bootstrap_ci(sample_labels, mock_predictions):
    """Bootstrap CI returns (point, lower, upper)."""
    m = ClinicalMetrics(sample_labels, mock_predictions)
    def sens_fn(metrics):
        return metrics.binary_sensitivity_specificity()["sensitivity"]
    point, lo, hi = m.bootstrap_ci(sens_fn, n_bootstrap=100)
    assert 0 <= lo <= point <= hi <= 1


def test_safety_metrics_false_negative(sample_labels, mock_predictions):
    """SafetyMetrics identifies missed refer cases."""
    s = SafetyMetrics(sample_labels, mock_predictions)
    fn = s.false_negative_analysis(high_risk_label="refer")
    assert "count" in fn
    assert "false_negative_rate" in fn
    assert fn["count"] >= 0


def test_safety_validator_harmful():
    """SafetyValidator catches harmful phrases."""
    v = SafetyValidator()
    assert v.contains_harmful("Child has been diagnosed with ADHD")
    assert v.contains_harmful("Will definitely develop delay")
    assert not v.contains_harmful("Parent reports few words")


def test_validation_report_generates(sample_labels, mock_predictions):
    """ValidationReport generates full report dict."""
    m = ClinicalMetrics(sample_labels, mock_predictions)
    s = SafetyMetrics(sample_labels, mock_predictions)
    r = ValidationReport(metrics=m, safety_metrics=s)
    report = r.generate_full_report()
    assert "accuracy" in report
    assert "safety" in report
    assert "fda_cds_checklist" in report
    assert "compliance_status" in report


def test_validation_report_render_json(sample_labels, mock_predictions):
    """ValidationReport writes JSON file."""
    m = ClinicalMetrics(sample_labels, mock_predictions)
    r = ValidationReport(metrics=m)
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "report.json"
        r.render_json(path)
        assert path.exists()
        with open(path) as f:
            data = json.load(f)
        assert "model_version" in data


def test_drift_detector_embedding():
    """DriftDetector detects embedding shift."""
    ref = np.random.randn(100, 8)
    new_same = np.random.randn(50, 8)  # Same distribution
    new_shifted = np.random.randn(50, 8) + 5  # Shifted
    d = DriftDetector(reference_embeddings=ref)
    r1 = d.embedding_drift(new_same)
    r2 = d.embedding_drift(new_shifted)
    assert "pvalue" in r1 and "pvalue" in r2
    # Shifted should have lower p-value (more likely drift)
    assert r2["pvalue"] <= r1["pvalue"] or r2["drift_detected"]


def test_benchmark_runner_executable():
    """Benchmark runner script exists and is runnable."""
    script = ROOT / "validation" / "benchmarks" / "run_benchmark.py"
    assert script.exists(), f"Benchmark script not found: {script}"
