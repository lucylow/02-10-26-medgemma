"""Tests for MedGemma real-mode and fallback behavior."""
import os

import pytest
from httpx import ASGITransport, AsyncClient

# Ensure fallback mode for CI before importing app
os.environ.setdefault("REAL_MODE", "false")
os.environ.setdefault("EMBED_MODE", "dummy")
os.environ.setdefault("FALLBACK_ON_ERROR", "true")

from backend.api import app


@pytest.mark.asyncio
async def test_infer_fallback_mode(monkeypatch):
    """With REAL_MODE=false, /infer returns fallback structure and fallback_used=true."""
    monkeypatch.setenv("REAL_MODE", "false")
    arr = __import__("numpy").ones((1, 256), dtype="float32")
    emb_b64 = __import__("base64").b64encode(arr.tobytes()).decode()
    payload = {
        "case_id": "test-case-1",
        "age_months": 24,
        "observations": "few words",
        "embedding_b64": emb_b64,
        "shape": [1, 256],
        "adapter_id": "test",
        "consent": {"consent_given": True},
    }
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        r = await ac.post("/infer", json=payload)
    assert r.status_code == 200
    j = r.json()
    assert "result" in j
    assert j["fallback_used"] is True


@pytest.mark.skipif(
    os.getenv("REAL_MODE", "false").lower() not in ("1", "true"),
    reason="Real mode not enabled",
)
@pytest.mark.asyncio
async def test_infer_real_mode_smoke():
    """Runs only locally with REAL_MODE=true and models available."""
    arr = __import__("numpy").ones((1, 256), dtype="float32")
    emb_b64 = __import__("base64").b64encode(arr.tobytes()).decode()
    payload = {
        "case_id": "test-case-2",
        "age_months": 24,
        "observations": "limited vocabulary",
        "embedding_b64": emb_b64,
        "shape": [1, 256],
        "adapter_id": "test",
        "consent": {"consent_given": True},
    }
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        r = await ac.post("/infer", json=payload, timeout=60.0)
    assert r.status_code == 200
    j = r.json()
    assert j["result"].get("model_id", "") != "fallback"
