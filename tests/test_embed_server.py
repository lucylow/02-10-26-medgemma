"""Tests for embed_server (MedSigLIP embedding API) and backend embed."""
import os

import pytest
from httpx import ASGITransport, AsyncClient

# Prefer backend.api for unified API
os.environ.setdefault("EMBED_MODE", "dummy")
os.environ.setdefault("REAL_MODE", "false")
os.environ.setdefault("USE_DUMMY", "1")

from backend.api import app


@pytest.mark.asyncio
async def test_health_endpoint():
    """Health returns status, model, device."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        r = await ac.get("/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert "model" in j or "embed_mode" in j


@pytest.mark.asyncio
async def test_embed_endpoint_returns_shape():
    """POST /embed returns embedding_b64 and shape."""
    from tests.conftest import _ensure_drawing_fixture

    path = _ensure_drawing_fixture()
    with open(path, "rb") as f:
        files = {"file": ("test.jpg", f, "image/jpeg")}
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            r = await ac.post("/embed", files=files)
    assert r.status_code == 200
    j = r.json()
    assert "embedding_b64" in j
    assert "shape" in j
    assert "emb_version" in j
    assert j["shape"][0] > 0
    assert j["shape"][1] > 0
