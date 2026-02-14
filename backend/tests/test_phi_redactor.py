"""Unit tests for PHI redactor."""
import pytest
from app.services.phi_redactor import redact_text


def test_redact_ssn():
    text = "Patient SSN: 123-45-6789"
    result = redact_text(text)
    assert result["redaction_applied"]
    assert "123-45-6789" not in result["redacted_text"]
    assert "REDACTED_SSN" in result["redacted_text"]


def test_redact_email():
    text = "Contact: john.doe@example.com"
    result = redact_text(text)
    assert "john.doe@example.com" not in result["redacted_text"]
    assert "REDACTED_EMAIL" in result["redacted_text"]


def test_redact_empty():
    result = redact_text("")
    assert result["redacted_text"] == ""
    assert result["redaction_applied"]


def test_redact_preserves_safe_text():
    text = "Child shows typical development for age."
    result = redact_text(text)
    assert result["redacted_text"] == text
    assert result["redaction_count"] == 0
