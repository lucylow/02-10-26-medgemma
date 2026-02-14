"""Tests for backend.api /health, /embed, /infer with DUMMY_MEDGEMMA=1."""
import base64
import os

import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient

# Ensure dummy mode before importing app
os.environ.setdefault("DUMMY_MEDGEMMA", "1")
os.environ.setdefault("EMBED_MODE", "dummy")
os.environ.setdefault("USE_DUMMY", "1")
os.environ.setdefault("REAL_MODE", "false")

from backend.api import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert "mode" in j or "embed_mode" in j


@pytest.mark.asyncio
async def test_embed():
    from tests.conftest import _ensure_drawing_fixture

    path = _ensure_drawing_fixture()
    with open(path, "rb") as f:
        files = {"file": ("test.jpg", f, "image/jpeg")}
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            r = await client.post("/embed", files=files)
    assert r.status_code == 200
    j = r.json()
    assert "embedding_b64" in j
    assert "shape" in j
    assert j["shape"][0] > 0
    assert j["shape"][1] > 0


@pytest.mark.asyncio
async def test_infer():
    arr = np.ones((1, 256), dtype=np.float32) * 0.01
    arr = arr / (np.linalg.norm(arr, axis=-1, keepdims=True) + 1e-12)
    b64 = base64.b64encode(arr.tobytes()).decode("ascii")

    payload = {
        "case_id": "test-uuid-123",
        "age_months": 24,
        "observations": "Limited pincer grasp; says 10 words",
        "embedding_b64": b64,
        "shape": [1, 256],
        "adapter_id": "pediscreen_v1",
        "consent": {"consent_given": True, "consent_id": "consent-uuid"},
    }
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.post("/infer", json=payload)
    assert r.status_code == 200
    j = r.json()
    assert j["case_id"] == "test-uuid-123"
    assert "result" in j
    assert "inference_ts" in j
    assert "risk" in j["result"] or "summary" in j["result"]


@pytest.mark.asyncio
async def test_infer_rejects_without_consent():
    arr = np.ones((1, 256), dtype=np.float32) * 0.01
    b64 = base64.b64encode(arr.tobytes()).decode("ascii")
    payload = {
        "case_id": "test-uuid",
        "age_months": 24,
        "observations": "test",
        "embedding_b64": b64,
        "shape": [1, 256],
        "consent": {"consent_given": False},
    }
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.post("/infer", json=payload)
    assert r.status_code == 403
