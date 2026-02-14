"""Tests for LegalMiddleware — disclaimer header, audit, policy scan."""
import pytest
from httpx import AsyncClient
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_medgemma_response_has_disclaimer_header():
    """MedGemma routes should include X-PediScreen-Disclaimer header."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        # Use a minimal medgemma generate request (may fail if no model, but we check headers)
        r = await ac.post(
            "/api/medgemma/generate",
            data={
                "screening_id": "test-123",
                "age_months": "24",
                "scores_json": "{}",
                "observations": "Child says a few words.",
            },
        )
        # 200 if model configured, 500 otherwise — either way we want the header
        assert "X-PediScreen-Disclaimer" in r.headers
        assert "clinical decision support" in r.headers["X-PediScreen-Disclaimer"].lower()


@pytest.mark.asyncio
async def test_consent_endpoint():
    """POST /api/consent records consent."""
    headers = {"x-api-key": settings.API_KEY, "Content-Type": "application/json"}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post(
            "/api/consent",
            json={
                "screening_id": "test-consent-1",
                "consent_given": True,
                "consent_scope": {"storeData": True, "deidentified": True},
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is True
