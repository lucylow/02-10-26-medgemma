"""
Consent API — record parental consent for screening and care coordination.
Stores consent_records in MongoDB for audit trail.
"""
import time
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
    consent_scope: Optional[dict] = Body(None),
    consent_method: str = Body("web"),
    recorded_by: Optional[str] = Body(None),
    api_key: str = Depends(get_api_key),
):
    """
    Record parental consent for screening. Called when ConsentModal is accepted.
    consent_scope: { storeData, shareWithEHR, deidentified } or similar.
    """
    scope = consent_scope or {"storeData": True, "shareWithEHR": False, "deidentified": True}
    doc = {
        "screening_id": screening_id,
        "patient_id": patient_id,
        "parent_name": parent_name,
        "consent_given": consent_given,
        "consent_scope": scope,
        "consent_method": consent_method,
        "recorded_by": recorded_by or "chw",
        "recorded_at": time.time(),
    }
    consent_id = ""
    try:
        db = get_db()
        result = await db.consent_records.insert_one(doc)
        consent_id = str(result.inserted_id) if result.inserted_id else ""
        await write_audit_entry(
            "consent_recorded",
            {"screening_id": screening_id, "patient_id": patient_id, "actor": recorded_by},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record consent: {e}",
        ) from e
    return {"success": True, "consent_id": consent_id}
