# backend/app/api/feedback.py
"""
Clinician feedback API for AI inference outputs (Pages 3, 8, 9).
Structured, auditable feedback tied to inference IDs.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.logger import logger
from app.core.security import get_api_key, get_api_key_or_supabase_user
from app.errors import ApiError, ErrorCodes
from app.services.feedback_store import (
    insert_feedback,
    get_feedback_by_inference,
    get_feedback_by_case,
    inference_exists,
)
from app.services.audit import write_audit

router = APIRouter(prefix="/api", tags=["Clinician Feedback"])

VALID_RISK = frozenset({"low", "monitor", "refer", "on_track", "high"})
VALID_FEEDBACK_TYPES = frozenset({"correction", "rating", "comment"})


class FeedbackCreate(BaseModel):
    """Request model for creating feedback."""
    inference_id: str
    case_id: str
    feedback_type: str = Field(..., description="correction | rating | comment")
    corrected_risk: Optional[str] = Field(None, description="low | monitor | refer | on_track | high")
    corrected_summary: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    clinician_notes: Optional[str] = None
    metadata: Optional[dict] = None


def _get_clinician_id(auth) -> str:
    """Resolve clinician ID from auth (Supabase user or API key placeholder)."""
    if isinstance(auth, dict):
        if auth.get("type") == "supabase" and auth.get("user_id"):
            return str(auth["user_id"])
        if auth.get("user_id"):
            return str(auth["user_id"])
    if isinstance(auth, str) and auth.startswith("supabase:"):
        uid = auth.replace("supabase:", "").strip()
        if uid:
            return uid
    # API key mode: use placeholder for dev (production should require clinician auth)
    return "00000000-0000-0000-0000-000000000001"


@router.post("/feedback")
async def create_feedback(
    payload: FeedbackCreate,
    auth=Depends(get_api_key_or_supabase_user),
):
    """
    Create new clinician feedback for an inference.
    Permission: API key or authenticated clinician (Supabase JWT).
    """
    # Validation (Page 9)
    if payload.feedback_type not in VALID_FEEDBACK_TYPES:
        raise ApiError(
            ErrorCodes.VALIDATION_ERROR,
            f"feedback_type must be one of: {', '.join(VALID_FEEDBACK_TYPES)}",
            status_code=422,
        )
    if payload.corrected_risk and payload.corrected_risk.lower() not in VALID_RISK:
        raise ApiError(
            ErrorCodes.VALIDATION_ERROR,
            f"corrected_risk must be one of: {', '.join(VALID_RISK)}",
            status_code=422,
        )
    if payload.rating is not None and (payload.rating < 1 or payload.rating > 5):
        raise ApiError(
            ErrorCodes.VALIDATION_ERROR,
            "rating must be between 1 and 5",
            status_code=422,
        )

    clinician_id = _get_clinician_id(auth)
    data = {
        "inference_id": payload.inference_id,
        "case_id": payload.case_id,
        "clinician_id": clinician_id,
        "feedback_type": payload.feedback_type,
        "corrected_risk": payload.corrected_risk,
        "corrected_summary": payload.corrected_summary,
        "rating": payload.rating,
        "comment": payload.comment,
        "clinician_notes": payload.clinician_notes,
        "metadata": payload.metadata or {},
    }

    try:
        feedback_id = insert_feedback(data)
    except Exception as e:
        logger.exception("Feedback insert failed: %s", e)
        raise ApiError(
            ErrorCodes.SAFE_ERROR,
            "Failed to save feedback",
            status_code=500,
        ) from e

    # Audit log (Page 8)
    try:
        write_audit(
            action="clinician_feedback",
            actor=clinician_id,
            target=payload.inference_id,
            payload={
                "event_type": "clinician_feedback",
                "resource_id": feedback_id,
                "actor_id": clinician_id,
                "inference_id": payload.inference_id,
                "case_id": payload.case_id,
                "feedback_type": payload.feedback_type,
                "feedback_data": {
                    "corrected_risk": payload.corrected_risk,
                    "rating": payload.rating,
                },
            },
        )
    except Exception as audit_err:
        logger.warning("Audit log write failed: %s", audit_err)

    return {
        "feedback_id": feedback_id,
        "inference_id": payload.inference_id,
        "case_id": payload.case_id,
        "status": "created",
    }


@router.get("/feedback/inference/{inference_id}")
async def get_feedback_for_inference(
    inference_id: str,
    _auth=Depends(get_api_key),
):
    """Retrieve all feedback for a given inference."""
    items = get_feedback_by_inference(inference_id)
    return {"inference_id": inference_id, "feedback": items}


@router.get("/feedback/case/{case_id}")
async def get_feedback_for_case(
    case_id: str,
    _auth=Depends(get_api_key),
):
    """Retrieve all feedback for a case (screening)."""
    items = get_feedback_by_case(case_id)
    return {"case_id": case_id, "feedback": items}


@router.delete("/feedback/{feedback_id}")
async def delete_feedback(
    feedback_id: str,
    _auth=Depends(get_api_key),
):
    """
    Optional: Delete feedback (restricted to author/admin).
    For MVP we return 501 - implement when RBAC is ready.
    """
    raise HTTPException(
        status_code=501,
        detail="Delete feedback not yet implemented; use audit trail for corrections.",
    )
