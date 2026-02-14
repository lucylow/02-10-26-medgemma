# backend/app/api/reports.py
"""
Report draft / approve REST endpoints with human-in-the-loop sign-off and audit trail.
"""
import base64
import json
import time
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Body, status
from fastapi.responses import Response

from app.core.config import settings
from app.core.logger import logger
from app.core.security import get_api_key
from app.security.google_auth import require_clinician, require_clinician_or_api_key
from app.services.db import get_db
from app.services.edit_guard import validate_edit
from app.services.fda_mapper import map_report_to_fda
from app.services.pdf_exporter import export_report_pdf
from app.services.pdf_renderer import generate_pdf_bytes
from app.services.pdf_signing import hash_pdf, embed_hash_in_pdf
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


@router.post("/api/reports/{report_id}/patch")
async def patch_report(
    report_id: str,
    body: dict = Body(...),
    api_key: str = Depends(get_api_key),
):
    """
    Apply clinician edits to a draft report. Merges edits into draft_json,
    appends audit entry, returns updated draft.
    """
    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    if doc.get("status") != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot patch a finalized report",
        )

    draft = doc.get("draft_json") or {}
    if isinstance(draft, dict) and "draft_json" in draft:
        draft = draft.get("draft_json", draft)
    draft = dict(draft) if isinstance(draft, dict) else {}

    # Merge clinician edits
    allowed = ("clinical_summary", "technical_summary", "parent_summary", "recommendations")
    changes = {}
    for k in allowed:
        if k in body:
            val = body[k]
            if k == "recommendations" and isinstance(val, str):
                val = [r.strip() for r in val.split("\n") if r.strip()]
            draft[k] = val
            changes[k] = val

    await db.reports.update_one(
        {"report_id": report_id},
        {"$set": {"draft_json": draft}},
    )

    try:
        await db.report_audit.insert_one(
            {
                "report_id": report_id,
                "action": "edited",
                "actor": "clinician",
                "payload": {"changes": changes},
                "created_at": time.time(),
            }
        )
    except Exception as e:
        logger.warning("Audit log insert failed: %s", e)

    return {
        "report_id": report_id,
        "draft_json": draft,
        "status": "draft",
    }


@router.get("/api/reports/drafts")
async def list_drafts(clinician: dict = Depends(require_clinician)):
    """List draft reports for clinician dashboard (requires Google Identity)."""
    db = get_db()
    cursor = db.reports.find({"status": "draft"}).sort("created_at", -1)
    items = []
    async for doc in cursor:
        items.append({
            "report_id": doc.get("report_id"),
            "screening_id": doc.get("screening_id"),
            "created_at": doc.get("created_at"),
        })
    return {"items": items}


@router.get("/api/reports/{report_id}")
async def get_report(
    report_id: str,
    _auth: dict = Depends(require_clinician_or_api_key),
):
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
    clinician: dict = Depends(require_clinician),
    clinician_id: str = Form(""),
    sign_note: Optional[str] = Form(None),
    send_to_ehr: Optional[bool] = Form(False),
    fhir_token: Optional[str] = Form(None),
    clinical_summary: Optional[str] = Form(None),
    recommendations: Optional[str] = Form(None),
):
    """
    Clinician approves a draft report. Role-based: only clinicians can finalize.
    This endpoint:
    - validates draft exists
    - applies optional edits (clinical_summary, recommendations) from form
    - updates report record with final_json and clinician signature metadata
    - optionally exports to FHIR/EHR using provided token
    - returns final report and any EHR response
    """
    if clinician.get("role") not in ("clinician", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clinician approval required",
        )

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
    clinician_email = clinician.get("email") or clinician_id or "clinician"
    final_json["clinician_approval"] = {
        "clinician_id": clinician_email,
        "signed_at": int(time.time()),
        "note": sign_note or "",
    }

    # Generate PDF with hash for tamper detection
    pdf_bytes = export_report_pdf(final_json, clinician_email, "final", pdf_hash=None)
    content_hash = hash_pdf(pdf_bytes)
    pdf_final = embed_hash_in_pdf(pdf_bytes, content_hash)
    pdf_hash_stored = hash_pdf(pdf_final)

    # Persist final_json, pdf_hash, and metadata
    await db.reports.update_one(
        {"report_id": report_id},
        {
            "$set": {
                "final_json": final_json,
                "status": "finalized",
                "clinician_id": clinician_email,
                "clinician_signed_at": time.time(),
                "pdf_hash": pdf_hash_stored,
            }
        },
    )

    # Audit log
    try:
        await db.report_audit.insert_one(
            {
                "report_id": report_id,
                "action": "signed",
                "actor": clinician_email,
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

    # Use tamper-evident PDF (already generated above)
    pdf_b64 = base64.b64encode(pdf_final).decode("utf-8")

    return {
        "success": True,
        "final_report": final_json,
        "ehr_response": ehr_response,
        "pdf_base64": pdf_b64,
    }


@router.get("/api/reports/export/pdf")
async def export_pdf(
    report_id: str,
    clinician: Optional[str] = None,
    api_key: str = Depends(get_api_key),
):
    """Export report as PDF with locked sections (audit-ready, clinician-safe)."""
    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if not doc:
        doc = await db.reports.find_one({"screening_id": report_id}, sort=[("created_at", -1)])
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    report = doc.get("final_json") or doc.get("draft_json") or {}
    if isinstance(report, dict) and "draft_json" in report:
        report = report.get("draft_json", report)
    version = "final" if doc.get("status") == "finalized" else "draft"
    clinician_name = doc.get("clinician_id") or clinician
    pdf_hash = doc.get("pdf_hash")
    pdf = export_report_pdf(report, clinician_name, version, pdf_hash=pdf_hash)
    if doc.get("status") == "finalized" and not pdf_hash:
        content_hash = hash_pdf(pdf)
        pdf = embed_hash_in_pdf(pdf, content_hash)
        pdf_hash_stored = hash_pdf(pdf)
        await db.reports.update_one(
            {"report_id": doc.get("report_id") or report_id},
            {"$set": {"pdf_hash": pdf_hash_stored}},
        )
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=pediatric_report.pdf"},
    )


@router.post("/api/ehr/attach-pdf")
async def attach_pdf_to_ehr(
    report_id: str = Form(...),
    patient_id: str = Form(...),
    fhir_base_url: str = Form(...),
    fhir_token: str = Form(..., description="SMART-on-FHIR OAuth2 access token"),
    clinician: dict = Depends(require_clinician),
):
    """
    Attach finalized PDF to EHR via SMART-on-FHIR DocumentReference.
    Requires clinician auth and a finalized report.
    """
    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if not doc:
        doc = await db.reports.find_one({"screening_id": report_id}, sort=[("created_at", -1)])
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    if doc.get("status") != "finalized":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only finalized reports can be attached to EHR",
        )

    report = doc.get("final_json") or doc.get("draft_json") or {}
    if isinstance(report, dict) and "draft_json" in report:
        report = report.get("draft_json", report)
    clinician_name = doc.get("clinician_id") or clinician.get("email", "Signed")
    pdf_hash = doc.get("pdf_hash")
    pdf = export_report_pdf(report, clinician_name, "final", pdf_hash=pdf_hash)

    from app.services.fhir_client import FHIRClient

    client = FHIRClient(fhir_base_url, fhir_token)
    result = client.upload_document_reference(
        patient_id=patient_id,
        pdf_bytes=pdf,
        title="PediScreen AI Developmental Screening",
    )
    return {"success": True, "document_reference": result}


@router.get("/api/reports/regulatory/fda-map")
async def fda_mapping(
    report_id: str,
    api_key: str = Depends(get_api_key),
):
    """Return FDA SaMD vs CDS risk mapping for a report."""
    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if not doc:
        # Try by screening_id
        doc = await db.reports.find_one({"screening_id": report_id}, sort=[("created_at", -1)])
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    report = doc.get("final_json") or doc.get("draft_json") or {}
    if isinstance(report, dict) and "draft_json" in report:
        report = report.get("draft_json", report)
    return map_report_to_fda(report)


@router.post("/api/reports/validate-edit")
async def validate_edit_endpoint(
    body: dict = Body(...),
    api_key: str = Depends(get_api_key),
):
    """Validate edits against safety constraints; returns flags if violations detected."""
    content = body.get("content", "")
    if isinstance(content, list):
        content = " ".join(str(c) for c in content)
    flags = validate_edit(str(content))
    return {"valid": len(flags) == 0, "flags": flags}


@router.get("/api/trajectory/{patient_id}")
async def trajectory_view(
    patient_id: str,
    domain: str = "communication",
    _auth: dict = Depends(require_clinician_or_api_key),
):
    """Compute developmental trajectory (improving/plateauing/concerning) from stored embeddings and risk scores."""
    from app.services.trajectory import compute_trajectory
    return await compute_trajectory(patient_id, domain)


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
