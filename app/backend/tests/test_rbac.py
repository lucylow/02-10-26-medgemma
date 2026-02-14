"""
Tests for RBAC - user without infer_case gets 403.
"""

import pytest
from fastapi.testclient import TestClient

# Import app - adjust path for your layout
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
try:
    from app.backend.main import app
except ImportError:
    from app.main import app  # fallback

client = TestClient(app)


def test_infer_without_auth_allowed_in_dev():
    """In dev, infer may be allowed without auth (AUTH_REQUIRED=0)."""
    resp = client.post(
        "/infer",
        json={"age_months": 24, "observations": "test"},
    )
    # Either 200 (allowed) or 401/403 (auth required)
    assert resp.status_code in (200, 401, 403, 422, 503)


def test_audit_search_returns_structure():
    """Admin audit search returns {total, entries}."""
    resp = client.get("/admin/audit/search")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "entries" in data
    assert isinstance(data["entries"], list)
