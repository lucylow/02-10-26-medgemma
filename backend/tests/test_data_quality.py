"""
Page 3: Data quality and validation pipeline tests.
"""
import pytest
from httpx import AsyncClient

from app.main import app
from app.core.config import settings
from app.services.health_data_preprocessor import HealthDataPreprocessor, DataQualityReport


class TestHealthDataPreprocessor:
    """Preprocessor unit tests."""

    def test_normalize_text(self):
        p = HealthDataPreprocessor()
        assert p.normalize_text("  hello  ") == "hello"
        assert p.normalize_text(None) == ""
        assert p.normalize_text("") == ""

    def test_process_screening_incomplete(self):
        p = HealthDataPreprocessor()
        payload = {"domain": "communication"}
        _, report = p.process_screening_input(payload, has_image=False)
        assert "child_age_months" in report.missing_fields or "observations" in report.missing_fields
        assert report.completeness_score < 1.0

    def test_process_screening_complete(self):
        p = HealthDataPreprocessor()
        payload = {
            "child_age_months": 24,
            "domain": "communication",
            "observations": "Child says about 15 words and points to pictures.",
        }
        processed, report = p.process_screening_input(payload, has_image=False)
        assert report.missing_fields == []
        assert report.completeness_score > 0.5
        assert processed["child_age_months"] == 24
        assert processed["domain"] == "communication"

    def test_consent_required_for_image(self):
        p = HealthDataPreprocessor(require_consent_for_images=True)
        payload = {
            "child_age_months": 24,
            "domain": "communication",
            "observations": "Test",
            "image_path": "/tmp/img.jpg",
        }
        _, report = p.process_screening_input(payload, has_image=True)
        assert "consent" in " ".join(report.validation_errors).lower() or not report.consent_present

    def test_consent_present_accepts_image(self):
        p = HealthDataPreprocessor(require_consent_for_images=True)
        payload = {
            "child_age_months": 24,
            "domain": "communication",
            "observations": "Test",
            "consent_flag": True,
            "consent_id": "c-123",
        }
        _, report = p.process_screening_input(payload, has_image=True)
        assert report.consent_present is True

    def test_noise_heuristic(self):
        p = HealthDataPreprocessor()
        _, r1 = p.process_screening_input(
            {"child_age_months": 24, "domain": "communication", "observations": "test"},
            has_image=False,
        )
        assert r1.probability_of_noise > 0.5

        _, r2 = p.process_screening_input(
            {
                "child_age_months": 24,
                "domain": "communication",
                "observations": "My child says about 15 words and points to pictures in books.",
            },
            has_image=False,
        )
        assert r2.probability_of_noise < 0.3


@pytest.mark.asyncio
async def test_data_quality_validate_incomplete():
    """POST /api/data-quality/validate with incomplete payload reflects gaps."""
    headers = {"x-api-key": settings.API_KEY}
    payload = {"domain": "communication"}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post("/api/data-quality/validate", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "missing_fields" in data
    assert len(data["missing_fields"]) > 0
    assert data["valid"] is False


@pytest.mark.asyncio
async def test_data_quality_validate_complete():
    """POST /api/data-quality/validate with complete payload returns valid."""
    headers = {"x-api-key": settings.API_KEY}
    payload = {
        "child_age_months": 24,
        "domain": "communication",
        "observations": "Child says about 15 words.",
    }
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post("/api/data-quality/validate", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "completeness_score" in data
    assert "valid" in data


@pytest.mark.asyncio
async def test_data_quality_get_not_found():
    """GET /api/data-quality/:case_id for non-existent case returns 404."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.get("/api/data-quality/nonexistent-case-12345")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_data_quality_consent_refusal():
    """Validate with image but no consent returns validation error."""
    headers = {"x-api-key": settings.API_KEY}
    payload = {
        "child_age_months": 24,
        "domain": "communication",
        "observations": "Test",
        "image_path": "/tmp/x.jpg",
    }
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post("/api/data-quality/validate", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is False
    assert any("consent" in e.lower() for e in data.get("validation_errors", []))
