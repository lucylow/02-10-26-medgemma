"""Unit tests for policy engine — forbidden claim detection."""
import pytest
from app.services.policy_engine import scan_and_rewrite, scan_forbidden


def test_scan_blocks_diagnostic_claim():
    text = "This is a definitive diagnosis of autism."
    out, modified = scan_and_rewrite(text)
    assert modified
    assert "DIAGNOSTIC_TERM_REDACTED" in out


def test_scan_blocks_guarantee():
    text = "We guarantee this result is accurate."
    out, modified = scan_and_rewrite(text)
    assert modified
    assert "STRONG_CLAIM_REDACTED" in out


def test_scan_blocks_100_percent_certain():
    text = "I am 100% certain about this finding."
    out, modified = scan_and_rewrite(text)
    assert modified
    assert "UNCERTAINTY_TERM_REDACTED" in out


def test_scan_passes_safe_text():
    text = "Screening suggests monitoring may be helpful. Refer to clinician."
    out, modified = scan_and_rewrite(text)
    assert not modified
    assert out == text


def test_scan_forbidden_detects_matches():
    text = "This is a diagnosis of ADHD."
    matches = scan_forbidden(text)
    assert len(matches) >= 1
    assert any("DIAGNOSTIC" in m[0] for m in matches)
