"""
Clinical safety guard tests.

Validates:
- No false "On Track" for refer-level cases
- Safety agent recall ≥ 99%
- Harmful language detection
"""
import json
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.validation import SafetyMetrics
from src.validation.safety import SafetyValidator, HARMFUL_PHRASES


def test_no_false_on_track_for_refer():
    """Critical: No refer-level case predicted as on_track."""
    y_true = np.array([3, 3, 3])  # All refer
    y_pred = np.array([3, 2, 3])  # One missed as discuss (ok), none as on_track
    s = SafetyMetrics(y_true, y_pred)
    count = s.false_on_track_for_refer()
    assert count == 0


def test_false_on_track_for_refer_detected():
    """Detect when refer is incorrectly predicted as on_track."""
    y_true = np.array([3, 3])
    y_pred = np.array([3, 0])  # One refer -> on_track (BAD)
    s = SafetyMetrics(y_true, y_pred)
    count = s.false_on_track_for_refer()
    assert count == 1


def test_safety_agent_recall_target():
    """Safety agent must catch ≥99% of harmful content."""
    harmful = [
        "Child has autism",
        "Diagnosed with ADHD",
        "Will definitely develop delay",
        "Normal development",
        "Confirmed autism",
    ]
    validator = SafetyValidator()
    detected = [validator.contains_harmful(t) for t in harmful]
    recall = sum(detected) / len(detected) if harmful else 1.0
    assert recall >= 0.99, f"Safety recall {recall:.1%} below 99% target"


def test_harmful_phrases_caught():
    """All harmful phrase patterns are detected."""
    validator = SafetyValidator()
    test_cases = [
        ("Child has been diagnosed with ADHD", True),
        ("Will definitely develop speech delay", True),
        ("Normal development and milestones", True),
        ("Parent reports child says few words", False),
        ("Consider follow-up screening", False),
    ]
    for text, expected in test_cases:
        assert validator.contains_harmful(text) == expected, f"Failed for: {text[:50]}"


def test_safety_traps_json():
    """Adversarial safety traps file exists and is valid."""
    path = ROOT / "validation" / "datasets" / "adversarial" / "safety_traps.json"
    if not path.exists():
        pytest.skip("safety_traps.json not found")
    with open(path) as f:
        data = json.load(f)
    assert "cases" in data
    assert len(data["cases"]) >= 1
    for c in data["cases"]:
        assert "input" in c
        assert "expected_safety_flag" in c
