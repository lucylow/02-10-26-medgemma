# backend/app/api/reports.py
"""
Report draft / approve REST endpoints with human-in-the-loop sign-off and audit trail.
"""
import base64
import json
import time
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.logger import logger
from app.core.security import get_api_key
from app.services.db import get_db
from app.services.pdf_renderer import generate_pdf_bytes
from app.services.report_generator import generate_report_from_screening

router = APIRouter()

# MedGemmaService lazy init (reuse from analyze)
_medgemma_svc = None


def _get_medgemma_svc():
    global _medgemma_svc
    if _medgemma_svc is None and (
        (settings.HF_MODEL and settings.HF_API_KEY)
        or (settings.VERTEX_PROJECT and settings.VERTEX_LOCATION)
    ):
        from app.services.medgemma_service import MedGemmaService

        _medgemma_svc = MedGemmaService(
            {
                "HF_MODEL": settings.HF_MODEL,
                "HF_API_KEY": settings.HF_API_KEY,
                "VERTEX_PROJECT": settings.VERTEX_PROJECT,
                "VERTEX_LOCATION": settings.VERTEX_LOCATION,
                "VERTEX_TEXT_ENDPOINT_ID": settings.VERTEX_TEXT_ENDPOINT_ID,
                "VERTEX_VISION_ENDPOINT_ID": settings.VERTEX_VISION_ENDPOINT_ID,
                "REDIS_URL": settings.REDIS_URL,
                "ALLOW_PHI": settings.ALLOW_PHI,
            }
        )
    return _medgemma_svc


@router.post("/api/reports/generate")
async def generate_report_endpoint(
    screening_id: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    api_key: str = Depends(get_api_key),
):
    """Generate a draft report from a screening record."""
    if not screening_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="screening_id required")

    db = get_db()
    doc = await db.screenings.find_one({"screening_id": screening_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="screening not found")

    # Map MongoDB doc to screening dict (childAge vs child_age_months)
    screening = {
        "screening_id": doc.get("screening_id"),
        "childAge": doc.get("childAge"),
        "child_age_months": doc.get("childAge"),
        "domain": doc.get("domain", ""),
        "observations": doc.get("observations", ""),
        "scores": doc.get("report", {}),
        "image_path": doc.get("image_path"),
        "submitted_by": doc.get("submitted_by"),
    }

    image_bytes = None
    image_filename = None
    if image:
        image_bytes = await image.read()
        image_filename = image.filename

    medgemma_svc = _get_medgemma_svc()
    draft = await generate_report_from_screening(
        screening,
        image_bytes=image_bytes,
        image_filename=image_filename,
        medgemma_svc=medgemma_svc,
    )

    return {"success": True, "draft": draft}


@router.get("/api/reports/by-screening/{screening_id}")
async def get_report_by_screening(
    screening_id: str,
    api_key: str = Depends(get_api_key),
):
    """Get the most recent report for a screening (supports ResultsScreen passing screeningId)."""
    db = get_db()
    doc = await db.reports.find_one(
        {"screening_id": screening_id},
        sort=[("created_at", -1)],
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="no report for this screening")
    return {
        "report_id": doc["report_id"],
        "screening_id": doc.get("screening_id"),
        "draft_json": doc.get("draft_json"),
        "final_json": doc.get("final_json"),
        "status": doc.get("status", "draft"),
        "clinician_id": doc.get("clinician_id"),
        "clinician_signed_at": doc.get("clinician_signed_at"),
        "created_at": doc.get("created_at"),
    }


@router.get("/api/reports/{report_id}")
async def get_report(report_id: str, api_key: str = Depends(get_api_key)):
    """Fetch a report by ID."""
    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    # Convert ObjectId and make draft_json easily accessible
    doc["_id"] = str(doc["_id"])
    if doc.get("clinician_signed_at"):
        doc["clinician_signed_at"] = doc["clinician_signed_at"]
    return {
        "report_id": doc["report_id"],
        "screening_id": doc.get("screening_id"),
        "draft_json": doc.get("draft_json"),
        "final_json": doc.get("final_json"),
        "status": doc.get("status", "draft"),
        "clinician_id": doc.get("clinician_id"),
        "clinician_signed_at": doc.get("clinician_signed_at"),
        "created_at": doc.get("created_at"),
    }


@router.post("/api/reports/{report_id}/approve")
async def approve_report(
    report_id: str,
    clinician_id: str = Form(""),
    sign_note: Optional[str] = Form(None),
    send_to_ehr: Optional[bool] = Form(False),
    fhir_token: Optional[str] = Form(None),
    clinical_summary: Optional[str] = Form(None),
    recommendations: Optional[str] = Form(None),
    api_key: str = Depends(get_api_key),
):
    """
    Clinician approves a draft report. This endpoint:
    - validates draft exists
    - applies optional edits (clinical_summary, recommendations) from form
    - updates report record with final_json and clinician signature metadata
    - optionally exports to FHIR/EHR using provided token
    - returns final report and any EHR response
    """
    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")

    draft = doc.get("draft_json") or doc
    if isinstance(draft, dict) and "draft_json" in draft:
        draft = draft.get("draft_json", draft)

    final_json = dict(draft) if isinstance(draft, dict) else {}
    # Apply clinician edits if provided
    if clinical_summary is not None:
        final_json["clinical_summary"] = clinical_summary
    if recommendations is not None:
        final_json["recommendations"] = [
            r.strip() for r in recommendations.split("\n") if r.strip()
        ]
    final_json["clinician_approval"] = {
        "clinician_id": clinician_id or "clinician",
        "signed_at": int(time.time()),
        "note": sign_note or "",
    }

    # Persist final_json and metadata
    await db.reports.update_one(
        {"report_id": report_id},
        {
            "$set": {
                "final_json": final_json,
                "status": "finalized",
                "clinician_id": clinician_id or "clinician",
                "clinician_signed_at": time.time(),
            }
        },
    )

    # Audit log
    try:
        await db.report_audit.insert_one(
            {
                "report_id": report_id,
                "action": "signed",
                "actor": clinician_id or "clinician",
                "payload": {"sign_note": sign_note},
                "created_at": time.time(),
            }
        )
    except Exception as e:
        logger.warning("Audit log insert failed: %s", e)

    # Optionally send to EHR
    ehr_response = None
    if send_to_ehr:
        if not fhir_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="fhir_token required to send to EHR",
            )
        fhir_base = getattr(settings, "FHIR_BASE_URL", None) or ""
        if not fhir_base:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="FHIR_BASE_URL not configured",
            )
        from app.services.fhir_client import post_to_fhir

        ehr_response = post_to_fhir(final_json, fhir_token, fhir_base)

    # Render PDF
    pdf_bytes = generate_pdf_bytes(final_json)
    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

    return {
        "success": True,
        "final_report": final_json,
        "ehr_response": ehr_response,
        "pdf_base64": pdf_b64,
    }


@router.get("/api/reports")
async def list_reports(
    status_filter: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    api_key: str = Depends(get_api_key),
):
    """List reports for clinician dashboard (drafts and finalized)."""
    db = get_db()
    query = {}
    if status_filter:
        query["status"] = status_filter
    cursor = db.reports.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(
            {
                "report_id": doc.get("report_id"),
                "screening_id": doc.get("screening_id"),
                "status": doc.get("status"),
                "created_at": doc.get("created_at"),
                "clinician_id": doc.get("clinician_id"),
            }
        )
    return {"items": items, "count": len(items)}
