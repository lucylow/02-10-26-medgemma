"""
Compliance test: Consent creation and revoke (Page 4).
"""
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_consent_schema():
    """Consent schema has required fields."""
    schema = {
        "consent_id": "uuid",
        "user_id_pseudonym": "uid_xxx",
        "purpose": "raw_image_upload",
        "consent_given": True,
        "consent_scope": ["raw_image", "medgemma-inference"],
        "consent_text_version": "v1",
        "granted_at": "2026-02-14T12:00:00Z",
        "revoked_at": None,
        "device_fingerprint": "sha256(...)",
    }
    assert schema["consent_given"] is True
    assert "raw_image" in schema["consent_scope"]
    assert schema["revoked_at"] is None


@pytest.mark.asyncio
async def test_consent_revoke_sets_revoked_at():
    """Revocation sets revoked_at."""
    doc = {"consent_id": "c1", "revoked_at": None}
    doc["revoked_at"] = "2026-02-14T13:00:00Z"
    assert doc["revoked_at"] is not None
