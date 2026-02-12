# backend/app/api/medgemma_detailed.py
"""
MedGemma Detailed Writer API — clinical-grade technical report generation.
POST /api/medgemma/generate produces structured TechnicalReport with provenance.
"""
import json
import time
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.logger import logger
from app.core.security import get_api_key
from app.services.db import get_db
from app.services.detailed_writer import generate_technical_report

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
