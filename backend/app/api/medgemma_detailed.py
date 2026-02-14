# backend/app/api/medgemma_detailed.py
"""
MedGemma Detailed Writer API — clinical-grade technical report generation.
POST /api/medgemma/generate produces structured TechnicalReport with provenance.
POST /api/medgemma/generate-end2end: PHI redaction → draft → Cloud SQL or MongoDB.
"""
import base64
import json
import time
from typing import Optional

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile, status

from app.core.logger import logger
from app.core.security import get_api_key
from app.services.db import get_db
from app.services.detailed_writer import generate_technical_report
from app.services.phi_redactor import redact_text
from app.services.db_cloudsql import (
    is_cloudsql_enabled,
    fetch_screening_by_id as cloudsql_fetch_screening,
    insert_report as cloudsql_insert_report,
    insert_report_audit as cloudsql_insert_report_audit,
    fetch_report_by_id as cloudsql_fetch_report,
    update_report_draft as cloudsql_update_report_draft,
    finalize_report as cloudsql_finalize_report,
)
from app.renderers.report_renderer import generate_pdf_bytes

router = APIRouter(prefix="/api/medgemma", tags=["MedGemma Detailed Writer"])


@router.post("/generate")
async def medgemma_generate(
    screening_id: str = Form(...),
    age_months: int = Form(...),
    scores_json: str = Form("{}"),
    observations: str = Form(""),
    image: Optional[UploadFile] = File(None),
    api_key: str = Depends(get_api_key),
):
    """
    Generate a technical report draft using MedGemma Detailed Writer.
    Returns structured TechnicalReport (clinical_summary, technical_summary, domains,
    evidence with provenance). Persists to reports collection.
    """
    try:
        scores = json.loads(scores_json)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scores_json must be valid JSON",
        )

    img_summary: Optional[str] = None
    if image:
        await image.read()  # consume for now; integrate vision summary when available
        img_summary = "Image: key visual patterns extracted (see model evidence)."

    # Fetch screening row if in DB
    db = get_db()
    screening_row: dict = {}
    try:
        doc = await db.screenings.find_one({"screening_id": screening_id})
        if doc:
            screening_row = {
                "screening_id": doc.get("screening_id"),
                "patient_id": doc.get("patient_id"),
                "childAge": doc.get("childAge"),
                "child_age_months": doc.get("childAge"),
            }
    except Exception as e:
        logger.warning("Could not fetch screening: %s", e)
    screening_row["screening_id"] = screening_id
    screening_row["patient_id"] = screening_row.get("patient_id")

    tr = await generate_technical_report(
        screening_row,
        age_months,
        scores,
        observations,
        img_summary,
        author_id=api_key,
        use_model=True,
    )

    # Persist to MongoDB reports collection
    try:
        draft_dict = tr.dict()
        patient_info = json.dumps(
            {"patient_id": tr.patient_id, "age_months": age_months}
        )
        await db.reports.insert_one(
            {
                "report_id": tr.report_id,
                "screening_id": tr.screening_id,
                "patient_info": patient_info,
                "draft_json": draft_dict,
                "final_json": None,
                "status": "draft",
                "clinician_id": None,
                "clinician_signed_at": None,
                "created_at": time.time(),
            }
        )
    except Exception as e:
        logger.exception("Failed to persist report: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist report",
        ) from e

    # Serialize for response (datetime -> ISO string)
    out = tr.dict()
    for k in ("created_at", "updated_at"):
        if k in out and out[k]:
            out[k] = out[k].isoformat() if hasattr(out[k], "isoformat") else out[k]
    for c in out.get("citations", []):
        if c.get("accessed_at"):
            c["accessed_at"] = (
                c["accessed_at"].isoformat()
                if hasattr(c["accessed_at"], "isoformat")
                else c["accessed_at"]
            )

    return out


# --- End-to-end flow: PHI redaction → draft → edit → finalize → PDF ---

@router.post("/generate-end2end")
async def generate_end2end(
    screening_id: str = Form(...),
    age_months: int = Form(...),
    scores_json: str = Form("{}"),
    observations: str = Form(""),
    image: Optional[UploadFile] = File(None),
    api_key: str = Depends(get_api_key),
):
    """
    1) Redact PHI from observations BEFORE sending to external LLMs
    2) Generate draft technical report (MedGemma-assisted)
    3) Persist draft into reports (Cloud SQL or MongoDB)
    4) Return draft JSON to frontend
    """
    try:
        scores = json.loads(scores_json)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scores_json must be valid JSON",
        )

    # 1) PHI redaction
    redaction_result = redact_text(observations)
    redacted_observations = redaction_result.get("redacted_text", observations)
    redaction_result.setdefault("method", "regex-only")

    # 2) Image summary placeholder
    img_summary: Optional[str] = None
    if image:
        await image.read()
        img_summary = "Visual features extracted (redacted image processed separately)."

    # 3) Fetch screening row
    screening_row: dict = {"screening_id": screening_id, "patient_id": None}
    if is_cloudsql_enabled():
        try:
            row = cloudsql_fetch_screening(screening_id)
            if row:
                screening_row = dict(row)
        except Exception as e:
            logger.warning("Could not fetch screening from Cloud SQL: %s", e)
    else:
        try:
            db = get_db()
            doc = await db.screenings.find_one({"screening_id": screening_id})
            if doc:
                screening_row = {
                    "screening_id": doc.get("screening_id"),
                    "patient_id": doc.get("patient_id"),
                    "childAge": doc.get("childAge"),
                    "child_age_months": doc.get("child_age_months") or doc.get("childAge"),
                }
        except Exception as e:
            logger.warning("Could not fetch screening from MongoDB: %s", e)
    screening_row["screening_id"] = screening_id

    # 4) Generate draft
    tr = await generate_technical_report(
        screening_row,
        int(age_months),
        scores,
        redacted_observations,
        img_summary,
        author_id=api_key,
        use_model=True,
    )

    # 5) Persist draft
    draft_dict = tr.dict()
    patient_info = {"patient_id": tr.patient_id, "age_months": age_months}

    if is_cloudsql_enabled():
        try:
            cloudsql_insert_report(
                tr.report_id,
                tr.screening_id or screening_id,
                patient_info,
                draft_dict,
            )
            cloudsql_insert_report_audit(
                tr.report_id,
                "created_draft",
                api_key,
                {"redaction": redaction_result},
            )
        except Exception as e:
            logger.exception("Failed to persist report to Cloud SQL: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist report",
            ) from e
    else:
        db = get_db()
        try:
            await db.reports.insert_one(
                {
                    "report_id": tr.report_id,
                    "screening_id": tr.screening_id,
                    "patient_info": json.dumps(patient_info),
                    "draft_json": draft_dict,
                    "final_json": None,
                    "status": "draft",
                    "clinician_id": None,
                    "clinician_signed_at": None,
                    "created_at": time.time(),
                }
            )
            await db.report_audit.insert_one(
                {
                    "report_id": tr.report_id,
                    "action": "created_draft",
                    "actor": api_key,
                    "payload": {"redaction": redaction_result},
                    "created_at": time.time(),
                }
            )
        except Exception as e:
            logger.exception("Failed to persist report to MongoDB: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist report",
            ) from e

    # Serialize for response
    out = draft_dict
    for k in ("created_at", "updated_at"):
        if k in out and out[k]:
            out[k] = out[k].isoformat() if hasattr(out[k], "isoformat") else out[k]
    for c in out.get("citations", []):
        if c.get("accessed_at"):
            c["accessed_at"] = (
                c["accessed_at"].isoformat()
                if hasattr(c["accessed_at"], "isoformat")
                else c["accessed_at"]
            )
    return out


@router.get("/reports/{report_id}")
async def get_medgemma_report(
    report_id: str,
    api_key: str = Depends(get_api_key),
):
    """Fetch a report by ID (Cloud SQL or MongoDB)."""
    if is_cloudsql_enabled():
        try:
            doc = cloudsql_fetch_report(report_id)
            if doc:
                draft = doc.get("draft_json") or doc.get("final_json")
                return {
                    "report_id": doc["report_id"],
                    "screening_id": doc.get("screening_id"),
                    "draft_json": draft,
                    "final_json": doc.get("final_json"),
                    "status": doc.get("status", "draft"),
                    "clinician_id": doc.get("clinician_id"),
                    "clinician_signed_at": doc.get("clinician_signed_at"),
                    "created_at": doc.get("created_at"),
                }
        except Exception as e:
            logger.warning("Cloud SQL fetch failed: %s", e)

    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    doc["_id"] = str(doc["_id"])
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


@router.post("/reports/{report_id}/patch")
async def patch_medgemma_report(
    report_id: str,
    patch: dict = Body(...),
    api_key: str = Depends(get_api_key),
):
    """Clinician edits the draft. Patch: clinical_summary, technical_summary, recommendations, parent_summary."""
    allowed = {"clinical_summary", "technical_summary", "recommendations", "parent_summary"}
    update_payload = {k: v for k, v in patch.items() if k in allowed}
    if not update_payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No editable fields provided")

    if is_cloudsql_enabled():
        try:
            doc = cloudsql_fetch_report(report_id)
            if not doc:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
            if doc.get("status") == "finalized":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot patch a finalized report",
                )
            draft = doc.get("draft_json") or {}
            draft = dict(draft)
            draft.update(update_payload)
            draft["updated_at"] = time.time()
            cloudsql_update_report_draft(report_id, draft)
            cloudsql_insert_report_audit(report_id, "patched", api_key, update_payload)
            return {"ok": True, "updated_draft": draft}
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Cloud SQL patch failed: %s", e)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) from e

    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    if doc.get("status") == "finalized":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot patch a finalized report",
        )
    draft = doc.get("draft_json") or {}
    draft = dict(draft)
    draft.update(update_payload)
    draft["updated_at"] = time.time()
    await db.reports.update_one({"report_id": report_id}, {"$set": {"draft_json": draft}})
    try:
        await db.report_audit.insert_one(
            {"report_id": report_id, "action": "patched", "actor": api_key, "payload": update_payload, "created_at": time.time()}
        )
    except Exception as e:
        logger.warning("Audit insert failed: %s", e)
    return {"ok": True, "updated_draft": draft}


@router.post("/reports/{report_id}/approve")
async def approve_medgemma_report(
    report_id: str,
    clinician_note: Optional[str] = Form(None),
    api_key: str = Depends(get_api_key),
):
    """
    Finalize and sign the report:
    - Move draft_json -> final_json
    - Mark status = 'finalized'
    - Render PDF and return base64
    - Create audit entries
    """
    if is_cloudsql_enabled():
        try:
            doc = cloudsql_fetch_report(report_id)
            if not doc:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
            draft = doc.get("draft_json") or {}
            draft = dict(draft)
            final = draft.copy()
            final["status"] = "finalized"
            final["clinician_approval"] = {"by": api_key, "note": clinician_note or "", "at": time.time()}
            cloudsql_finalize_report(report_id, final, api_key)
            cloudsql_insert_report_audit(
                report_id, "finalized", api_key, {"clinician_note": clinician_note}
            )
            pdf_bytes = generate_pdf_bytes(final)
            pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
            return {"ok": True, "final": final, "pdf_base64": pdf_b64}
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Cloud SQL approve failed: %s", e)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) from e

    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    draft = doc.get("draft_json") or {}
    draft = dict(draft)
    final = draft.copy()
    final["status"] = "finalized"
    final["clinician_approval"] = {"by": api_key, "note": clinician_note or "", "at": time.time()}
    await db.reports.update_one(
        {"report_id": report_id},
        {
            "$set": {
                "final_json": final,
                "status": "finalized",
                "clinician_id": api_key,
                "clinician_signed_at": time.time(),
            }
        },
    )
    try:
        await db.report_audit.insert_one(
            {"report_id": report_id, "action": "finalized", "actor": api_key, "payload": {"clinician_note": clinician_note}, "created_at": time.time()}
        )
    except Exception as e:
        logger.warning("Audit insert failed: %s", e)
    pdf_bytes = generate_pdf_bytes(final)
    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
    return {"ok": True, "final": final, "pdf_base64": pdf_b64}
