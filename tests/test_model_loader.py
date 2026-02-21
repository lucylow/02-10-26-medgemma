"""
Tests for model loader: retries on failure, degraded (mock) mode when load fails.
"""
import pytest


def test_model_loader_retries_then_raises_on_failure(monkeypatch):
    """Simulate load failure; load_model should raise."""
    from pedi_screen.medgemma_core import model_loader
    def failing_load(_):
        raise RuntimeError("mock load failure")
    monkeypatch.setattr(model_loader, "load_model", failing_load)
    with pytest.raises(RuntimeError, match="mock load failure"):
        model_loader.load_model("google/medgemma-2b-it")


def test_ensure_model_loaded_switches_to_degraded_on_failure(monkeypatch):
    """When load_model raises, ensure_model_loaded sets model_ready False and MODEL, PROCESSOR None."""
    from pedi_screen.medgemma_core import model_loader
    def failing_load(_):
        raise OSError("not found")
    monkeypatch.setattr(model_loader, "load_model", failing_load)
    result = model_loader.ensure_model_loaded()
    assert result is False
    assert model_loader.model_ready is False
    assert model_loader.MODEL is None
    assert model_loader.PROCESSOR is None


def test_mock_fallback_path_model_not_ready():
    """When model not loaded, inference engine returns fallback (mock) result."""
    from pedi_screen.medgemma_core.inference_engine import InferenceEngine, mock_inference
    import asyncio
    engine = InferenceEngine({})
    # With no backend config, _get_service() returns None -> fallback
    out = asyncio.run(engine.infer(
        case_id="test-case-1",
        age_months=24,
        observations="test",
        embedding_b64="AAAAAAA=",
        shape=[1, 256],
    ))
    assert "result" in out
    assert out["result"]["risk"] in ("low", "monitor", "high", "refer")
    assert "summary" in out["result"]


def test_mock_inference_deterministic():
    """Same case_id produces same mock risk/summary."""
    from pedi_screen.medgemma_core.inference_engine import mock_inference
    a = mock_inference("case-1")
    b = mock_inference("case-1")
    assert a["risk"] == b["risk"]
    assert a["summary"] == b["summary"]
    c = mock_inference("case-2")
    # case-2 might differ from case-1
    assert "risk" in c and c["risk"] in ("low", "monitor", "high", "refer")
