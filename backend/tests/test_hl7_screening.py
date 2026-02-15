"""Unit tests for HL7 screening message builder."""
import pytest
from app.services.hl7_screening import build_screening_oru, _escape_hl7


def test_build_screening_oru():
    msg = build_screening_oru(
        screening_id="scr-1",
        patient_id="p1",
        age_months=24,
        risk_level="medium",
        summary="Child shows delayed expressive language.",
        domain="communication",
    )
    assert "MSH|^~\\&|PEDISCREEN" in msg
    assert "ORU^R01" in msg
    assert "PID|||p1" in msg
    assert "OBR" in msg
    assert "OBX|1|CE|RISK" in msg
    assert "OBX|2|TX|SUMMARY" in msg
    assert "OBX|4|NM|AGE" in msg
    assert "24" in msg
    assert "medium" in msg


def test_escape_hl7():
    assert _escape_hl7("a|b") == "a\\F\\b"
    assert _escape_hl7("") == ""
    assert _escape_hl7("normal") == "normal"
