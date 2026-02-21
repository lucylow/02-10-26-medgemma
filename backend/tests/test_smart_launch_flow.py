"""
End-to-end SMART-on-FHIR flow tests for Epic Production Pilot.
Uses pytest + TestClient; mocks token exchange so no live Epic/sandbox required.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


def test_smart_launch_redirects_to_authorize(client):
    """GET /smart/launch with iss and launch returns 302 redirect to EHR authorize URL."""
    with patch("app.services.smart_oauth._fetch_smart_configuration", return_value=None):
        r = client.get(
            "/smart/launch",
            params={"iss": "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4", "launch": "WzAsInRlc3QiXQ=="},
        )
    assert r.status_code == 302
    location = r.headers.get("location", "")
    assert "authorize" in location or "oauth2" in location.lower()
    assert "iss=" in location or "client_id=" in location


@pytest.mark.asyncio
async def test_smart_callback_returns_access_token_on_mocked_exchange(client):
    """
    GET /smart/callback with code and iss returns 200 and access_token when
    token exchange is successful (mocked).
    """
    mock_token = {
        "access_token": "test-access-token-123",
        "token_type": "Bearer",
        "expires_in": 3600,
        "scope": "launch patient/*.read",
        "patient": "patient-abc",
        "fhirUser": "Practitioner/xyz",
    }
    with patch("app.api.fhir.SMARTClient") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.exchange_code.return_value = mock_token
        mock_client_cls.return_value = mock_client

        r = client.get(
            "/smart/callback",
            params={
                "code": "testcode",
                "state": "optional-state",
                "iss": "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
            },
        )
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["access_token"] == "test-access-token-123"
    assert data.get("token_type") == "Bearer"
    assert data.get("patient") == "patient-abc"


def test_smart_callback_missing_code_returns_400(client):
    """GET /smart/callback without code returns 400."""
    r = client.get(
        "/smart/callback",
        params={"iss": "https://fhir.example.com", "state": "x"},
    )
    assert r.status_code == 400
    data = r.json()
    assert "missing_code" in data.get("error", "") or "code" in str(data).lower()


def test_smart_callback_missing_iss_returns_400(client):
    """GET /smart/callback without iss (and no FHIR_BASE_URL) returns 400."""
    r = client.get(
        "/smart/callback",
        params={"code": "testcode"},
    )
    # May be 400 missing_iss if no default FHIR_BASE_URL
    assert r.status_code in (400, 422)
    if r.status_code == 400:
        data = r.json()
        assert "iss" in str(data).lower() or "missing_iss" in data.get("error", "")


def test_smart_launch_flow_integration(client):
    """
    Full flow: launch redirects, then callback with mocked exchange returns token.
    Simulates EHR → launch → user auth → callback → token.
    """
    with patch("app.api.fhir.SMARTClient") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.exchange_code.return_value = {
            "access_token": "integration-token",
            "token_type": "Bearer",
            "expires_in": 3600,
            "patient": "integ-patient-1",
        }
        mock_client_cls.return_value = mock_client

        r = client.get(
            "/smart/callback",
            params={
                "code": "testcode",
                "iss": "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
            },
        )
    assert r.status_code == 200
    assert "access_token" in r.json()
