"""
Unit tests for interoperability API — export_bundle, PDF, HL7, push (mocked).
"""
import pytest
from httpx import AsyncClient

from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_export_bundle_404_when_report_missing():
    """Export bundle returns 404 when report not found."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.get("/api/fhir/export_bundle/nonexistent-report-xyz")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_export_pdf_404_when_report_missing():
    """Export PDF returns 404 when report not found."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.get("/api/fhir/export/pdf/nonexistent-report-xyz")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_export_hl7v2_404_when_report_missing():
    """Export HL7 v2 returns 404 when report not found."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.get("/api/fhir/export/hl7v2/nonexistent-report-xyz")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_ehr_status_404_when_export_missing():
    """EHR status returns 404 when export not found."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.get("/api/ehr/status/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_push_bundle_403_when_consent_denied():
    """Push bundle returns 403 when consent_given is False."""
    headers = {"x-api-key": settings.API_KEY}
    payload = {
        "case_id": "test-1",
        "fhir_base_url": "http://localhost:8080/fhir",
        "fhir_token": "fake-token",
        "consent_given": False,
    }
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post("/api/fhir/push_bundle", json=payload)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_fhir_conformance_400_when_not_configured(monkeypatch):
    """Conformance returns 400 when FHIR_BASE_URL not set."""
    from app.api import interoperability
    monkeypatch.setattr(interoperability.settings, "FHIR_BASE_URL", None)
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.get("/api/fhir/conformance")
    assert r.status_code == 400
