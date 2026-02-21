"""
Tests for calibration and structured explainability.
"""
import pytest

from app.calibration import (
    bound_confidence,
    requires_clinician_review,
    apply_calibration,
    LOW_CONFIDENCE_THRESHOLD,
)
from app.schemas.explainability_structured import (
    validate_explainability,
    ensure_explainability_in_output,
    ExplainabilityItem,
)


def test_bound_confidence():
    assert bound_confidence(0.3) == 0.5
    assert bound_confidence(1.5) == 0.95
    assert bound_confidence(0.7) == 0.7
    assert bound_confidence("x") == 0.5


def test_requires_clinician_review():
    assert requires_clinician_review(0.5) is True
    assert requires_clinician_review(0.65) is False
    assert requires_clinician_review(0.59) is True


def test_apply_calibration():
    out = apply_calibration({"confidence": 0.2, "risk": "monitor"})
    assert out["confidence"] == 0.5
    assert out.get("requires_clinician_review") is True
    out2 = apply_calibration({"confidence": 0.8})
    assert out2["confidence"] == 0.8
    assert out2.get("requires_clinician_review") is not True


def test_validate_explainability():
    valid = [{"type": "milestone_gap", "feature": "two_word_phrases", "age_expected": 24, "confidence_weight": 0.32}]
    out = validate_explainability(valid)
    assert len(out) == 1
    assert out[0]["type"] == "milestone_gap"
    out2 = validate_explainability([{"type": "x"}, "not-a-dict"])
    assert len(out2) == 1


def test_ensure_explainability_in_output():
    out = ensure_explainability_in_output({"risk": "low"})
    assert "explainability" in out
    assert isinstance(out["explainability"], list)
