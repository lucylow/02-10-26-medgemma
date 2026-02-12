# backend/tests/test_api.py
import pytest
from httpx import AsyncClient
from app.main import app
from app.core.config import settings

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        r = await ac.get("/health")
        assert r.status_code == 200
        assert "status" in r.json()

@pytest.mark.asyncio
async def test_analyze_missing_key():
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        # no API key header -> 401
        r = await ac.post("/api/analyze", data={"childAge": "24", "domain":"language", "observations":"test"})
        assert r.status_code == 422 or r.status_code == 401  # depends if header validated first

@pytest.mark.asyncio
async def test_analyze_with_key():
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post("/api/analyze", data={"childAge": "24", "domain":"language", "observations":"My 2-year-old says only about 10 words"})
        assert r.status_code == 200
        body = r.json()
        assert "report" in body
        assert body["report"]["riskLevel"] in ["low", "medium", "high"]
