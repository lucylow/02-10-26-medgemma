# backend/app/api/radiology.py
"""
Radiology case prioritization: AI-assisted urgency labeling + automatic queue sorting.
Clinical decision-support; clinician review and override required. Audit-ready.
"""
from datetime import datetime
from typing import Optional

from bson.binary import Binary
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.core.config import settings
from app.core.logger import logger
from app.core.security import get_api_key
from app.services.db import get_db
from app.services.radiology_vision import analyze_radiology_image
from app.services.radiology_priority import classify_priority
from app.services.dicom_ingest import dicom_to_png_bytes, is_dicom
from app.services.gradcam import generate_gradcam
from app.services.benchmark import benchmark as run_benchmark
from app.services.hl7_oru import build_oru_r01
from app.services.hl7_sender import send_hl7

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
    Accepts DICOM (.dcm) or standard image formats. Returns suggested priority; clinician review required.
    """
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image")

    if image.filename and is_dicom(image.filename):
        try:
            image_bytes = dicom_to_png_bytes(raw)
        except Exception as e:
            logger.exception("DICOM conversion failed: %s", e)
            raise HTTPException(status_code=400, detail=f"DICOM conversion failed: {e}")
    else:
        image_bytes = raw

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

    # Generate explainability heatmap (Grad-CAM style)
    explainability_image = None
    try:
        activation_map = ai.get("activation_map")
        explainability_image = generate_gradcam(image_bytes, activation_map)
    except Exception as e:
        logger.warning("Explainability heatmap generation failed: %s", e)

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
    if explainability_image:
        doc["explainability_image"] = Binary(explainability_image)
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
    Optionally pushes HL7 ORU^R01 to EHR when HL7_HOST is configured.
    """
    if final_priority not in ("stat", "urgent", "routine"):
        raise HTTPException(status_code=400, detail="Invalid priority; use stat, urgent, or routine")

    db = get_db()
    doc = await db.radiology_studies.find_one({"study_id": study_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Study not found")

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

    # HL7 ORU^R01 push when configured
    if settings.HL7_HOST:
        try:
            hl7_msg = build_oru_r01(
                study_id=study_id,
                patient_id=doc.get("patient_id", ""),
                priority=final_priority,
                summary=doc.get("ai_summary", ""),
            )
            send_hl7(hl7_msg, settings.HL7_HOST, settings.HL7_PORT)
        except Exception as e:
            logger.warning("HL7 push failed: %s", e)

    return {"status": "reviewed"}


@router.get("/api/radiology/{study_id}/explainability")
async def get_explainability_image(
    study_id: str,
    _: str = Depends(get_api_key),
):
    """
    Return Grad-CAM style explainability overlay for a study.
    Clinician-facing only; non-diagnostic.
    """
    db = get_db()
    doc = await db.radiology_studies.find_one(
        {"study_id": study_id},
        {"explainability_image": 1},
    )
    if not doc or not doc.get("explainability_image"):
        raise HTTPException(status_code=404, detail="Explainability image not available")

    img_bytes = doc["explainability_image"]
    return Response(content=bytes(img_bytes), media_type="image/png")


@router.get("/api/radiology/benchmark")
async def benchmark_queue(_: str = Depends(get_api_key)):
    """
    Benchmark: time-to-read reduction from prioritization.
    Compares baseline (all routine) vs prioritized queue.
    """
    db = get_db()
    cursor = db.radiology_studies.find(
        {"status": "pending"},
        {"priority_label": 1},
    )
    studies = []
    async for doc in cursor:
        studies.append({"priority_label": doc.get("priority_label", "routine")})
    return run_benchmark(studies)
