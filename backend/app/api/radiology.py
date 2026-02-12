# backend/app/api/radiology.py
"""
Radiology case prioritization: AI-assisted urgency labeling + automatic queue sorting.
Clinical decision-support; clinician review and override required. Audit-ready.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.logger import logger
from app.core.security import get_api_key
from app.services.db import get_db
from app.services.radiology_vision import analyze_radiology_image
from app.services.radiology_priority import classify_priority

router = APIRouter()

# Priority sort order: stat=1, urgent=2, routine=3
PRIORITY_ORDER = {"stat": 1, "urgent": 2, "routine": 3}


def require_clinician(api_key: str = Depends(get_api_key)):
    """
    Placeholder for clinician auth. In production, validate JWT/session.
    For now, API key grants access (same as other protected endpoints).
    """
    return {"email": "api_user", "role": "clinician"}


@router.post("/api/radiology/upload")
async def upload_study(
    study_id: str = Form(...),
    patient_id: str = Form(...),
    modality: str = Form("XR"),
    body_part: str = Form(""),
    image: UploadFile = File(...),
    _: str = Depends(get_api_key),
):
    """
    Upload a radiology study. AI analyzes image for triage urgency.
    Returns suggested priority; clinician review required.
    """
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image")

    try:
        ai = await analyze_radiology_image(image_bytes, modality)
    except Exception as e:
        logger.exception("Radiology vision analysis failed: %s", e)
        ai = {
            "findings": ["AI analysis unavailable; manual triage required."],
            "risk_score": 0.3,
        }

    priority = classify_priority(ai["risk_score"], modality)
    ai_summary = ", ".join(ai["findings"][:5]) if ai.get("findings") else ""

    db = get_db()
    doc = {
        "study_id": study_id,
        "patient_id": patient_id,
        "modality": modality,
        "body_part": body_part or None,
        "uploaded_at": datetime.utcnow(),
        "priority_score": ai["risk_score"],
        "priority_label": priority,
        "status": "pending",
        "ai_summary": ai_summary,
        "override_priority": None,
        "reviewed_by": None,
    }
    await db.radiology_studies.insert_one(doc)

    return {
        "study_id": study_id,
        "priority": priority,
        "note": "AI-generated triage suggestion; clinician review required",
    }


@router.get("/api/radiology/queue")
async def get_queue(_: str = Depends(get_api_key)):
    """
    Get radiology worklist sorted by priority (stat > urgent > routine), then FIFO.
    """
    db = get_db()
    cursor = db.radiology_studies.find({"status": "pending"}).sort(
        [("priority_label", 1), ("uploaded_at", 1)]
    )
    # MongoDB doesn't sort by custom enum order; we sort in Python
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if "uploaded_at" in doc and hasattr(doc["uploaded_at"], "isoformat"):
            doc["uploaded_at"] = doc["uploaded_at"].isoformat()
        items.append(doc)

    # Sort: stat=1, urgent=2, routine=3, then uploaded_at asc
    items.sort(key=lambda x: (PRIORITY_ORDER.get(x.get("priority_label", "routine"), 3), x.get("uploaded_at", "")))

    return {"items": items}


@router.post("/api/radiology/{study_id}/review")
async def review_study(
    study_id: str,
    final_priority: str = Form(...),
    clinician: dict = Depends(require_clinician),
):
    """
    Radiologist review: set final priority and mark as reviewed.
    Explicit override; logged reviewer; audit-ready.
    """
    if final_priority not in ("stat", "urgent", "routine"):
        raise HTTPException(status_code=400, detail="Invalid priority; use stat, urgent, or routine")

    db = get_db()
    result = await db.radiology_studies.update_one(
        {"study_id": study_id},
        {
            "$set": {
                "override_priority": final_priority,
                "status": "reviewed",
                "reviewed_by": clinician.get("email", "unknown"),
                "reviewed_at": datetime.utcnow(),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Study not found")

    return {"status": "reviewed"}
