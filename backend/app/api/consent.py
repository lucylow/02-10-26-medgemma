"""
Consent API — record parental consent for screening and care coordination (Page 4).
Stores consent_records in MongoDB with full schema; append-only; supports revocation.
"""
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from app.core.security import get_api_key
from app.services.db import get_db
from app.services.legal_audit import write_audit_entry

router = APIRouter(prefix="/api/consent", tags=["Consent"])


@router.post("")
async def record_consent(
    screening_id: Optional[str] = Body(None),
    patient_id: Optional[str] = Body(None),
    parent_name: Optional[str] = Body(None),
    consent_given: bool = Body(True),
    consent_scope: Optional[Any] = Body(None),
    consent_method: str = Body("web"),
    recorded_by: Optional[str] = Body(None),
    user_id_pseudonym: Optional[str] = Body(None),
    purpose: Optional[str] = Body("raw_image_upload"),
    consent_text_version: Optional[str] = Body("v1"),
    device_fingerprint: Optional[str] = Body(None),
    api_key: str = Depends(get_api_key),
):
    """
    Record parental consent. Returns consent_id for use with raw_image uploads.
    Full schema supports: consent_id, user_id_pseudonym, purpose, consent_scope, granted_at, revoked_at.
    """
    scope = consent_scope
    if scope is None:
        scope = ["raw_image", "medgemma-inference"]
    elif isinstance(scope, dict):
        scope = [k for k, v in scope.items() if v] if scope else ["raw_image"]
    elif not isinstance(scope, list):
        scope = ["raw_image"]

    consent_id = str(uuid.uuid4())
    granted_at = datetime.now(timezone.utc).isoformat()

    doc = {
        "consent_id": consent_id,
        "user_id_pseudonym": user_id_pseudonym,
        "screening_id": screening_id,
        "patient_id": patient_id,
        "parent_name": parent_name,
        "purpose": purpose or "raw_image_upload",
        "consent_given": consent_given,
        "consent_scope": scope,
        "consent_text_version": consent_text_version or "v1",
        "granted_at": granted_at,
        "revoked_at": None,
        "device_fingerprint": device_fingerprint,
        "consent_method": consent_method,
        "recorded_by": recorded_by or "chw",
        "recorded_at": time.time(),
    }
    try:
        db = get_db()
        await db.consent_records.insert_one(doc)
        await write_audit_entry(
            "consent_created",
            {
                "consent_id": consent_id,
                "screening_id": screening_id,
                "patient_id": patient_id,
                "actor": recorded_by,
                "purpose": doc["purpose"],
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record consent: {e}",
        ) from e
    return {"success": True, "consent_id": consent_id}


@router.post("/revoke")
async def revoke_consent(
    consent_id: str = Body(..., embed=True),
    api_key: str = Depends(get_api_key),
):
    """Mark consent as revoked. Sets revoked_at; append-only (no deletion)."""
    try:
        db = get_db()
        result = await db.consent_records.update_one(
            {"consent_id": consent_id},
            {"$set": {"revoked_at": datetime.now(timezone.utc).isoformat()}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Consent not found")
        await write_audit_entry(
            "consent_revoked",
            {"consent_id": consent_id, "actor": "user"},
        )
        return {"success": True, "consent_id": consent_id, "revoked": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke consent: {e}",
        ) from e
