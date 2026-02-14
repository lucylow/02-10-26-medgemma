"""
PACS WADO-RS ingestion: pull DICOM studies from hospital PACS for AI triage.
DICOMweb standard; Bearer token auth (SMART / hospital gateway compatible).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_api_key
from app.services.wado_rs import fetch_dicom_instance
from app.services.dicom_ingest import dicom_to_png_bytes
from app.services.radiology_vision import analyze_radiology_image
from app.services.radiology_priority import classify_priority
from app.core.disclaimers import FDA_RADIOLOGY_DISCLAIMER

router = APIRouter()


class PacsIngestRequest(BaseModel):
    study_uid: str
    series_uid: str
    instance_uid: str
    pacs_url: str
    access_token: str
    modality: str = "XR"


@router.post("/api/radiology/pacs-ingest")
async def ingest_from_pacs(
    body: PacsIngestRequest,
    _: str = Depends(get_api_key),
):
    """
    Ingest a DICOM instance from PACS via WADO-RS.
    Fetches study, converts to PNG, runs AI triage. Returns suggested priority.
    PACS-native; no PHI stored unless configured. Works with Epic, Sectra, GE, Philips PACS.
    """
    try:
        dicom_bytes = await fetch_dicom_instance(
            body.pacs_url,
            body.study_uid,
            body.series_uid,
            body.instance_uid,
            body.access_token,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"PACS fetch failed: {e}",
        )

    try:
        image_bytes = dicom_to_png_bytes(dicom_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"DICOM conversion failed: {e}",
        )

    ai = await analyze_radiology_image(image_bytes, body.modality)
    priority = classify_priority(ai["risk_score"], body.modality)
    summary = ", ".join(ai["findings"][:5]) if ai.get("findings") else ""

    return {
        "risk_score": ai["risk_score"],
        "priority": priority,
        "summary": summary,
        "note": "Pulled via WADO-RS; AI triage only",
        "disclaimer": FDA_RADIOLOGY_DISCLAIMER,
    }
