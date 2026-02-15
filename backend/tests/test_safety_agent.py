"""Tests for Safety Agent: rejects diagnoses, unsafe phrasing."""
import pytest
from app.services.safety_agent import check_safety, apply_safety_to_result


def test_check_safety_accepts_safe_text():
    ok, reasons, _ = check_safety("Observations suggest patterns worth monitoring.")
    assert ok is True
    assert len(reasons) == 0


def test_check_safety_rejects_diagnosis():
    ok, reasons, adj = check_safety("This child has autism.")
    assert ok is False
    assert any("diagnosis" in r.lower() or "autism" in r.lower() for r in reasons)


def test_check_safety_rejects_promise():
    ok, reasons, _ = check_safety("Your child will definitely be normal.")
    assert ok is False


def test_apply_safety_escalates_to_discuss():
    risk, conf, c, p, r = apply_safety_to_result(
        "monitor", 0.8,
        "Child may have autism.",  # unsafe
        "Parent text.",
        ["Evidence."],
    )
    assert risk == "discuss"
    assert conf < 0.8
