"""
Page 2: API tests for screening endpoint with ScreeningInput schema.
Validates valid/invalid payloads return expected status codes.
"""
import pytest
from httpx import AsyncClient

from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_screening_valid_payload():
    """Valid ScreeningInput returns 200."""
    headers = {"x-api-key": settings.API_KEY}
    payload = {
        "child_age_months": 24,
        "domain": "communication",
        "observations": "Child says about 10 words.",
    }
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post("/api/screening", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert "report" in body
    assert "screening_id" in body
    assert body["report"]["riskLevel"] in ["low", "medium", "high", "monitor"]


@pytest.mark.asyncio
async def test_screening_missing_child_age():
    """Missing child_age_months returns 422."""
    headers = {"x-api-key": settings.API_KEY}
    payload = {"domain": "communication", "observations": "test"}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post("/api/screening", json=payload)
    assert r.status_code == 422
    data = r.json()
    assert "validation_errors" in data.get("details", {}) or "child_age_months" in str(data).lower()


@pytest.mark.asyncio
async def test_screening_invalid_age_range():
    """child_age_months out of range returns 422."""
    headers = {"x-api-key": settings.API_KEY}
    payload = {"child_age_months": 300, "domain": "communication", "observations": "test"}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post("/api/screening", json=payload)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_schemas_screening_input():
    """GET /api/schemas/screening-input returns JSON Schema."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.get("/api/schemas/screening-input")
    assert r.status_code == 200
    schema = r.json()
    assert "properties" in schema
    assert "child_age_months" in schema.get("properties", {})


@pytest.mark.asyncio
async def test_schemas_asq_domain_scores():
    """GET /api/schemas/asq-domain-scores returns JSON Schema."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.get("/api/schemas/asq-domain-scores")
    assert r.status_code == 200
    schema = r.json()
    assert "properties" in schema
    assert "communication" in schema.get("properties", {})
