"""
Tests for HAI model layer: BaseModel, registry, mock model, MedGemma wrapper, post-processor.
"""
import pytest

from app.models.interface import BaseModel
from app.models.model_registry import ModelRegistry, get_registry
from app.models.mock_model import MockModel
from app.models.embedding_model import MockEmbeddingModel
from app.models.post_processor import validate_and_sanitize, should_fallback, fallback_response


def test_mock_model_infer():
    m = MockModel()
    out = m.infer({"case_id": "test-1"})
    assert "summary" in out and "risk" in out and "confidence" in out
    assert out["risk"] in ("low", "monitor", "high", "refer")
    assert 0 <= out["confidence"] <= 1
    assert m.health_check() is True
    assert "model_id" in m.metadata()


def test_mock_model_deterministic():
    m = MockModel()
    out1 = m.infer({"case_id": "same-id"})
    out2 = m.infer({"case_id": "same-id"})
    assert out1["risk"] == out2["risk"]
    assert out1["confidence"] == out2["confidence"]


def test_mock_embedding_model():
    emb = MockEmbeddingModel(dim=64)
    out = emb.infer({"case_id": "c1"})
    assert "embedding_b64" in out and "shape" in out
    assert out["shape"] == [1, 64]
    assert emb.health_check() is True


def test_registry_register_and_get():
    reg = ModelRegistry()
    reg.register("mock", MockModel())
    m = reg.get("mock")
    assert m is not None
    assert reg.get("nonexistent") is None
    out = reg.get_or_default("mock").infer({"case_id": "x"})
    assert "risk" in out


def test_registry_get_or_default():
    reg = ModelRegistry()
    reg.register("mock", MockModel())
    m = reg.get_or_default(None, "mock")
    assert m is not None
    with pytest.raises(ValueError):
        reg.get_or_default("missing", "also_missing")


def test_validate_and_sanitize():
    out = validate_and_sanitize({
        "risk": "high",
        "confidence": 0.3,
        "summary": ["a"],
        "recommendations": [],
        "reasoning_chain": [],
        "evidence": [],
    })
    assert out["risk"] == "high"
    assert 0.5 <= out["confidence"] <= 0.95
    assert out.get("requires_clinician_review") is True


def test_should_fallback():
    assert should_fallback({"fallback": True}) is True
    assert should_fallback({"confidence": 0.3}) is True
    assert should_fallback({"risk": "manual_review_required", "confidence": 0.5}) is False


def test_fallback_response():
    r = fallback_response("timeout")
    assert r["risk"] == "manual_review_required"
    assert r["fallback"] is True
    assert "timeout" in r["reason"]
