"""
Tests for inference fallback: mock returned when model unavailable; audit entry with fallback_used.
"""
import os
import tempfile
import pytest


@pytest.fixture
def audit_log_path(tmp_path):
    path = tmp_path / "audit.log"
    os.environ["AUDIT_LOG_PATH"] = str(path)
    yield path
    os.environ.pop("AUDIT_LOG_PATH", None)


def test_mock_inference_returns_structured_result():
    from pedi_screen.medgemma_core.inference_engine import mock_inference
    out = mock_inference("case-xyz")
    assert "summary" in out
    assert "risk" in out
    assert "recommendations" in out
    assert out["risk"] in ("low", "monitor", "high", "refer")
    assert "Mock" in out.get("explain", "") or "mock" in str(out.get("explain", "")).lower()


def test_audit_log_written_with_fallback_used(audit_log_path):
    """Call log_audit with fallback_used=True and assert file contains event."""
    try:
        from monitoring.audit import log_audit
    except ImportError:
        try:
            from backend.app.services.audit import log_inference_audit as log_audit
        except ImportError:
            pytest.skip("audit module not importable")
    log_audit(
        request_id="req-1",
        case_id="case-1",
        model_id="",
        adapter_id="",
        emb_version="v1",
        success=True,
        fallback_used=True,
    )
    content = audit_log_path.read_text()
    assert "fallback_used" in content
    assert "true" in content.lower() or "True" in content


def test_deterministic_seed_same_case_same_output():
    from pedi_screen.medgemma_core.inference_engine import deterministic_seed, mock_inference
    s1 = deterministic_seed("abc")
    s2 = deterministic_seed("abc")
    assert s1 == s2
    o1 = mock_inference("abc")
    o2 = mock_inference("abc")
    assert o1["risk"] == o2["risk"]
    assert o1["summary"] == o2["summary"]
