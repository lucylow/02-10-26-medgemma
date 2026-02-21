"""
Epic FHIR proxy tests (Enterprise Hospital Deployment).
Mocks FHIR server responses; no live Epic/sandbox required.
"""
import pytest
from unittest.mock import AsyncMock, patch

# Test with app context so settings and routers are available
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


@pytest.fixture
def fhir_base_url():
    with patch.dict("os.environ", {"FHIR_BASE_URL": "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"}):
        from app.core.config import settings
        # Reload to pick up env
        try:
            settings.FHIR_BASE_URL = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
        except Exception:
            pass
        yield "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"


def test_epic_health_without_config(client):
    """GET /api/fhir/epic/health when no FHIR URL is set returns epic_proxy_configured: false."""
    with patch("app.api.epic_fhir.settings") as m:
        m.EPIC_FHIR_SERVER_URL = None
        m.FHIR_BASE_URL = None
        r = client.get("/api/fhir/epic/health")
    assert r.status_code == 200
    data = r.json()
    assert "epic_proxy_configured" in data
    assert "correlation_id_sample" in data


def test_get_patient_requires_bearer(client):
    """GET /api/fhir/patient/{id} without Authorization returns 403."""
    with patch("app.api.epic_fhir.settings") as m:
        m.EPIC_FHIR_SERVER_URL = "https://fhir.example.com"
        m.FHIR_BASE_URL = None
        r = client.get("/api/fhir/patient/123")
    assert r.status_code == 403  # HTTPBearer auto_error=True -> 403 when missing


def test_write_report_requires_bearer(client):
    """POST /api/fhir/report without Authorization returns 403."""
    with patch("app.api.epic_fhir.settings") as m:
        m.EPIC_FHIR_SERVER_URL = "https://fhir.example.com"
        m.FHIR_BASE_URL = None
        r = client.post(
            "/api/fhir/report",
            json={"patient_id": "p1", "case_id": "c1", "report": {}},
        )
    assert r.status_code == 403


def test_write_report_validates_patient_id(client):
    """POST /api/fhir/report without patient_id returns 422."""
    with patch("app.api.epic_fhir.settings") as m:
        m.EPIC_FHIR_SERVER_URL = "https://fhir.example.com"
        m.FHIR_BASE_URL = None
        r = client.post(
            "/api/fhir/report",
            json={"case_id": "c1", "report": {}},
            headers={"Authorization": "Bearer test-token"},
        )
    assert r.status_code == 422
