# backend/tests/test_feedback.py
"""Tests for clinician feedback API (Pages 3, 9, 19)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# Use dev API key for tests
HEADERS = {"x-api-key": "dev-example-key"}


def test_feedback_create():
    """Test successful feedback creation."""
    payload = {
        "inference_id": "00000000-0000-0000-0000-000000000001",
        "case_id": "ps-test-123",
        "feedback_type": "correction",
        "corrected_risk": "refer",
        "rating": 4,
        "comment": "Test feedback",
    }
    resp = client.post("/api/feedback", json=payload, headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert "feedback_id" in data
    assert data.get("inference_id") == payload["inference_id"]
    assert data.get("status") == "created"


def test_feedback_invalid_type():
    """Test validation: invalid feedback_type."""
    payload = {
        "inference_id": "00000000-0000-0000-0000-000000000002",
        "case_id": "ps-test-456",
        "feedback_type": "invalid_type",
    }
    resp = client.post("/api/feedback", json=payload, headers=HEADERS)
    assert resp.status_code == 422


def test_feedback_invalid_rating():
    """Test validation: rating out of range."""
    payload = {
        "inference_id": "00000000-0000-0000-0000-000000000003",
        "case_id": "ps-test-789",
        "feedback_type": "rating",
        "rating": 10,  # must be 1-5
    }
    resp = client.post("/api/feedback", json=payload, headers=HEADERS)
    assert resp.status_code == 422


def test_feedback_invalid_risk():
    """Test validation: invalid corrected_risk."""
    payload = {
        "inference_id": "00000000-0000-0000-0000-000000000004",
        "case_id": "ps-test-abc",
        "feedback_type": "correction",
        "corrected_risk": "invalid_risk",
    }
    resp = client.post("/api/feedback", json=payload, headers=HEADERS)
    assert resp.status_code == 422


def test_feedback_retrieve():
    """Test retrieve feedback for inference."""
    inference_id = "00000000-0000-0000-0000-000000000001"
    resp = client.get(f"/api/feedback/inference/{inference_id}", headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert "feedback" in data
    assert data["inference_id"] == inference_id


def test_feedback_retrieve_case():
    """Test retrieve feedback for case."""
    case_id = "ps-test-123"
    resp = client.get(f"/api/feedback/case/{case_id}", headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert "feedback" in data
    assert data["case_id"] == case_id


def test_feedback_auth_required():
    """Test that feedback create requires auth."""
    payload = {
        "inference_id": "00000000-0000-0000-0000-000000000005",
        "case_id": "ps-test",
        "feedback_type": "comment",
    }
    resp = client.post("/api/feedback", json=payload)
    assert resp.status_code == 401
