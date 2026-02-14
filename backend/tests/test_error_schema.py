# backend/tests/test_error_schema.py
"""
Tests for standardized error response schema (Page 2).
Ensures all API errors return {code, message, details?} format.
"""
import pytest
from httpx import AsyncClient

from app.main import app
from app.core.config import settings
from app.errors import ErrorResponse, ErrorCodes


def _assert_error_schema(body: dict) -> None:
    """Assert response body conforms to ErrorResponse schema."""
    assert "code" in body, f"Missing 'code' in error response: {body}"
    assert "message" in body, f"Missing 'message' in error response: {body}"
    assert isinstance(body["code"], str)
    assert isinstance(body["message"], str)
    if "details" in body and body["details"] is not None:
        assert isinstance(body["details"], dict)


@pytest.mark.asyncio
async def test_auth_error_returns_standardized_schema():
    """401 from missing API key should return {code, message}."""
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        r = await ac.post(
            "/api/analyze",
            data={"childAge": "24", "domain": "language", "observations": "test"},
        )
    assert r.status_code == 401
    body = r.json()
    _assert_error_schema(body)
    assert body["code"] == ErrorCodes.AUTH_FAIL
    assert "message" in body["message"]


@pytest.mark.asyncio
async def test_validation_error_returns_standardized_schema():
    """422 from invalid/missing fields should return {code, message, details}."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        # Missing required childAge
        r = await ac.post(
            "/api/analyze",
            data={"domain": "language", "observations": "test"},
        )
    assert r.status_code == 422
    body = r.json()
    _assert_error_schema(body)
    assert body["code"] == ErrorCodes.VALIDATION_ERROR
    assert "details" in body
    assert "validation_errors" in body.get("details", {})


@pytest.mark.asyncio
async def test_invalid_payload_returns_standardized_schema():
    """400 from invalid childAge (non-integer) should return INVALID_PAYLOAD."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post(
            "/api/analyze",
            data={"childAge": "not-a-number", "domain": "language", "observations": "test"},
        )
    assert r.status_code == 400
    body = r.json()
    _assert_error_schema(body)
    assert body["code"] == ErrorCodes.INVALID_PAYLOAD
    assert body.get("details", {}).get("field") == "childAge" or "childAge" in body["message"]


@pytest.mark.asyncio
async def test_infer_model_not_configured_returns_standardized_schema():
    """503 when MedGemma not configured should return MODEL_LOAD_FAIL."""
    headers = {"x-api-key": settings.API_KEY}
    async with AsyncClient(app=app, base_url="http://testserver", headers=headers) as ac:
        r = await ac.post(
            "/api/infer",
            json={
                "case_id": "test-1",
                "age_months": 24,
                "observations": "test",
                "embedding_b64": "AAAAAAA=",  # minimal valid b64
                "shape": [1, 256],
            },
        )
    # If model not configured -> 503; if configured but embedding invalid -> 400
    assert r.status_code in (400, 503)
    body = r.json()
    _assert_error_schema(body)
    if r.status_code == 503:
        assert body["code"] == ErrorCodes.MODEL_LOAD_FAIL
    else:
        assert body["code"] in (ErrorCodes.EMBEDDING_PARSE_ERROR, ErrorCodes.MODEL_LOAD_FAIL)


@pytest.mark.asyncio
async def test_embed_invalid_image_returns_standardized_schema():
    """400 from invalid image should return INVALID_IMAGE."""
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        r = await ac.post(
            "/api/embed",
            files={"file": ("fake.png", b"not an image", "image/png")},
        )
    assert r.status_code == 400
    body = r.json()
    _assert_error_schema(body)
    assert body["code"] == ErrorCodes.INVALID_IMAGE


@pytest.mark.asyncio
async def test_embed_payload_too_large_returns_standardized_schema():
    """413 from oversized image should return PAYLOAD_TOO_LARGE."""
    # 10MB + 1 byte
    oversized = b"x" * (10 * 1024 * 1024 + 1)
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        r = await ac.post(
            "/api/embed",
            files={"file": ("huge.png", oversized, "image/png")},
        )
    assert r.status_code == 413
    body = r.json()
    _assert_error_schema(body)
    assert body["code"] == ErrorCodes.PAYLOAD_TOO_LARGE


@pytest.mark.asyncio
async def test_error_response_model_serialization():
    """ErrorResponse Pydantic model serializes correctly."""
    err = ErrorResponse(code="TEST_CODE", message="Test message", details={"key": "value"})
    d = err.model_dump(exclude_none=True)
    assert d == {"code": "TEST_CODE", "message": "Test message", "details": {"key": "value"}}

    err2 = ErrorResponse(code="SIMPLE", message="No details")
    d2 = err2.model_dump(exclude_none=True)
    assert "details" not in d2 or d2.get("details") is None
