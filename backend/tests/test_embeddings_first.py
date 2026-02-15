"""
Compliance test: Embeddings-first — raw_image without consent returns 400 (Page 3).
"""
import pytest
from fastapi.testclient import TestClient

# Import from backend app
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app

client = TestClient(app)


def test_analyze_raw_image_without_consent_returns_400():
    """Sending raw image without consent_id and consent_given returns 400."""
    # Use multipart form like /api/analyze
    response = client.post(
        "/api/analyze",
        data={
            "childAge": "24",
            "domain": "communication",
            "observations": "Few words",
            # No consent_id, no consent_given
        },
        files={"image": ("test.jpg", b"fake-image-bytes", "image/jpeg")},
        headers={"x-api-key": "dev-example-key"},
    )
    assert response.status_code == 400
    body = response.json()
    msg = (body.get("message") or body.get("detail") or str(body)).lower()
    assert "consent" in msg


def test_embeddings_without_raw_image_succeed():
    """Embeddings submitted without raw images succeed (infer endpoint)."""
    # /api/infer accepts embedding_b64 only - no raw image
    import base64
    import struct
    emb = [0.1] * 256
    b64 = base64.b64encode(struct.pack("f" * len(emb), *emb)).decode()
    response = client.post(
        "/api/infer",
        json={
            "case_id": "test-1",
            "age_months": 24,
            "observations": "Few words",
            "embedding_b64": b64,
            "shape": [1, 256],
        },
        headers={"x-api-key": "dev-example-key"},
    )
    # May be 503 if model not configured, but not 400 for consent
    assert response.status_code in (200, 503)
    if response.status_code == 400:
        assert "consent" not in str(response.json()).lower()
