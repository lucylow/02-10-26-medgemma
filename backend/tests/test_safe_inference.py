"""Tests for Epic Production Pilot safe-inference guardrail (drift/bias/OOM → fallback)."""
import os
import pytest
from unittest.mock import patch, AsyncMock

from app.services.safe_inference import (
    psi_value,
    bias_metric_violated,
    fallback_checklist,
    safe_inference,
    _is_oom,
)


def test_psi_value_returns_float():
    assert isinstance(psi_value(), float)
    assert psi_value() >= 0.0


def test_bias_metric_violated_default_false():
    with patch.dict(os.environ, {}, clear=False):
        # Ensure env not set
        os.environ.pop("SAFE_INFERENCE_BIAS_VIOLATED", None)
    assert bias_metric_violated() is False


def test_bias_metric_violated_env_true():
    with patch.dict(os.environ, {"SAFE_INFERENCE_BIAS_VIOLATED": "1"}):
        assert bias_metric_violated() is True
    with patch.dict(os.environ, {"SAFE_INFERENCE_BIAS_VIOLATED": "true"}):
        assert bias_metric_violated() is True


def test_fallback_checklist_shape():
    out = fallback_checklist({"case_id": "c1", "age_months": 24, "observations": "Some text"})
    assert "result" in out
    assert "provenance" in out
    assert out.get("fallback_used") is True
    res = out["result"]
    assert res["risk"] in ("low", "monitor", "high", "refer")
    assert "summary" in res and "recommendations" in res


def test_fallback_checklist_deterministic():
    a = fallback_checklist({"case_id": "same", "age_months": 12})
    b = fallback_checklist({"case_id": "same", "age_months": 12})
    assert a["result"]["risk"] == b["result"]["risk"]


def test_is_oom():
    assert _is_oom(MemoryError()) is True
    assert _is_oom(ValueError("CUDA out of memory")) is True
    assert _is_oom(RuntimeError("resource exhausted")) is True
    assert _is_oom(ValueError("other")) is False


@pytest.mark.asyncio
async def test_safe_inference_uses_fallback_when_bias_violated():
    with patch.dict(os.environ, {"SAFE_INFERENCE_BIAS_VIOLATED": "1"}):
        mock_predict = AsyncMock(return_value={"result": {}, "provenance": {}, "inference_time_ms": 10})
        out = await safe_inference(
            mock_predict,
            case_id="c1",
            age_months=18,
            observations="",
        )
    assert out.get("fallback_used") is True
    assert "result" in out and out["result"]["risk"] in ("low", "monitor", "high", "refer")
    mock_predict.assert_not_called()


@pytest.mark.asyncio
async def test_safe_inference_calls_model_when_guards_ok():
    with patch.dict(os.environ, {"SAFE_INFERENCE_BIAS_VIOLATED": ""}):
        mock_predict = AsyncMock(return_value={
            "result": {"risk": "low", "summary": ["Ok"]},
            "provenance": {},
            "inference_time_ms": 5,
        })
        out = await safe_inference(
            mock_predict,
            case_id="c1",
            age_months=18,
            observations="x",
            embedding_b64="e==",
            shape=[1, 256],
            emb_version="v1",
        )
    assert out.get("fallback_used") is not True
    assert out["result"]["risk"] == "low"
    mock_predict.assert_called_once()


@pytest.mark.asyncio
async def test_safe_inference_oom_fallback():
    with patch.dict(os.environ, {"SAFE_INFERENCE_BIAS_VIOLATED": ""}):
        async def oom_predict(**kwargs):
            raise RuntimeError("CUDA out of memory")
        out = await safe_inference(
            oom_predict,
            case_id="c2",
            age_months=12,
            observations="",
        )
    assert out.get("fallback_used") is True
    assert "result" in out
