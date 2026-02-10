
import pytest
from fastapi.testclient import TestClient
import base64
import numpy as np
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import app from main
# Note: we might need to mock services to avoid loading large models
from unittest.mock import MagicMock, patch

with patch('app.backend.medgemma_service.MedGemmaService'), \
     patch('app.backend.medsiglip_service.MedSigLIPService'), \
     patch('app.backend.gemma3_service.Gemma3Service'):
    from app.backend.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True

def test_validation_error_invalid_age():
    # age_months must be <= 72
    payload = {
        "age_months": 100,
        "domain": "communication",
        "observations": "Test"
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 422 # Pydantic validation error

def test_validation_error_invalid_domain():
    payload = {
        "age_months": 24,
        "domain": "invalid_domain",
        "observations": "Test"
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 422
    assert "domain must be one of" in response.json()["detail"][0]["msg"]

def test_validation_error_invalid_image_b64():
    payload = {
        "age_months": 24,
        "domain": "communication",
        "observations": "Test",
        "image_b64": "not-base64-!!!"
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 422
    assert "image_b64 must be a valid base64 string" in response.json()["detail"][0]["msg"]

@patch('app.backend.main.medgemma_service')
def test_inference_failure_handling(mock_medgemma):
    mock_medgemma.infer.side_effect = Exception("Inference engine crashed")
    
    payload = {
        "age_months": 24,
        "domain": "communication",
        "observations": "Test"
    }
    response = client.post("/analyze", json=payload)
    
    # Should be caught by our global handler or the specific try-except
    assert response.status_code == 500
    assert "Inference failed" in response.json()["error"]
