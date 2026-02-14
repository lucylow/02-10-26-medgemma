# backend/app/api/analyze.py
import time
import uuid
from fastapi import APIRouter, File, UploadFile, Form, Depends, BackgroundTasks
from app.core.config import settings
from app.core.logger import logger
from app.core.security import get_api_key
from app.errors import ApiError, ErrorCodes
from app.services.storage import save_upload, remove_file
from app.services.phi_redactor import redact_text
from app.services.model_wrapper import analyze as run_analysis
from app.services.medgemma_service import MedGemmaService
from app.services.db import get_db
from app.services.db_cloudsql import is_cloudsql_enabled, insert_screening_record as cloudsql_insert_screening
from app.models.schemas import AnalyzeResponse
from typing import Optional
from datetime import datetime

router = APIRouter()

# MedGemmaService: lazy init when Vertex or HF is configured
_medgemma_svc = None


def _get_medgemma_svc() -> Optional[MedGemmaService]:
    global _medgemma_svc
    if _medgemma_svc is None and (
        (settings.HF_MODEL and settings.HF_API_KEY)
        or (settings.VERTEX_PROJECT and settings.VERTEX_LOCATION)
    ):
        _medgemma_svc = MedGemmaService({
            "HF_MODEL": settings.HF_MODEL,
            "HF_API_KEY": settings.HF_API_KEY,
            "VERTEX_PROJECT": settings.VERTEX_PROJECT,
            "VERTEX_LOCATION": settings.VERTEX_LOCATION,
            "VERTEX_TEXT_ENDPOINT_ID": settings.VERTEX_TEXT_ENDPOINT_ID,
            "VERTEX_VISION_ENDPOINT_ID": settings.VERTEX_VISION_ENDPOINT_ID,
            "REDIS_URL": settings.REDIS_URL,
            "ALLOW_PHI": settings.ALLOW_PHI,
            "MEDSIGLIP_ENABLE_LOCAL": getattr(settings, "MEDSIGLIP_ENABLE_LOCAL", True),
            "LORA_ADAPTER_PATH": getattr(settings, "LORA_ADAPTER_PATH", None),
            "BASE_MODEL_ID": getattr(settings, "BASE_MODEL_ID", "google/medgemma-2b-it"),
        })
    return _medgemma_svc


def _medgemma_report_to_response(analysis_result: dict, age: int, domain: str, screening_id: str) -> dict:
    """Map MedGemmaService output to AnalyzeResponse schema."""
    report = analysis_result["report"]
    summary = report.get("clinical_summary") or {
        "low": "Observations are within typical ranges; continue routine monitoring.",
        "monitor": "Some markers of concern. Monitoring and follow-up or formal screening recommended.",
        "high": "Screening suggests significant concerns. Please seek prompt clinical evaluation.",
    }.get(report.get("riskLevel", "monitor"), "Automated draft.")
    evidence = [
        {"type": "text", "content": kf, "influence": 0.8}
        for kf in report.get("keyFindings", [])
    ]
    provenance = analysis_result.get("provenance", {})
    return {
        "success": True,
        "screening_id": screening_id,
        "report": {
            "riskLevel": report.get("riskLevel", "monitor"),
            "confidence": report.get("confidence", 0.5),
            "summary": summary,
            "keyFindings": report.get("keyFindings", []),
            "recommendations": report.get("recommendations", []),
            "evidence": evidence,
            "analysis_meta": {
                "age_months": age,
                "domain": domain,
                "image_provided": bool(analysis_result.get("image_embedding")),
                "provenance": provenance,
            },
        },
        "timestamp": int(time.time()),
    }


@router.post("/api/analyze", response_model=AnalyzeResponse, status_code=200, dependencies=[Depends(get_api_key)])
async def analyze_endpoint(
    background_tasks: BackgroundTasks,
    childAge: str = Form(...),
    domain: str = Form(""),
    observations: str = Form(""),
    image: UploadFile | None = File(None)
):
    # validate age
    try:
        age = int(childAge)
    except ValueError:
        raise ApiError(
            ErrorCodes.INVALID_PAYLOAD,
            "childAge must be an integer representing months",
            status_code=400,
            details={"field": "childAge", "expected": "integer"},
        )

    # PHI redaction before external model calls
    redaction_result = redact_text(observations or "")
    observations_clean = redaction_result["redacted_text"]

    saved_path = None
    image_bytes = None
    if image:
        saved_path = save_upload(image, filename=f"{int(datetime.utcnow().timestamp())}_{image.filename}")
        logger.info(f"Saved upload to {saved_path}")
        try:
            with open(saved_path, "rb") as f:
                image_bytes = f.read()
        except Exception as e:
            logger.warning(f"Could not read image bytes: {e}")

    # Prefer MedGemmaService when configured; fallback to model_wrapper
    medgemma_svc = _get_medgemma_svc()
    try:
        if medgemma_svc:
            analysis_result = await medgemma_svc.analyze_input(
                age_months=age,
                domain=domain,
                observations=observations_clean,
                image_bytes=image_bytes,
                image_filename=image.filename if image else None,
            )
            screening_id = f"ps-{int(time.time())}-{uuid.uuid4().hex[:8]}"
            result = _medgemma_report_to_response(analysis_result, age, domain, screening_id)
        else:
            result = await run_analysis(child_age_months=age, domain=domain, observations=observations_clean, image_path=saved_path)
    except Exception as e:
        logger.error(f"Analysis failure: {e}")
        # cleanup file if present
        if saved_path:
            remove_file(saved_path)
        raise ApiError(
            ErrorCodes.ANALYSIS_FAILED,
            "Analysis failed",
            status_code=500,
            details={"error": str(e)} if settings.DEBUG else None,
        ) from e

    # Save screening record in DB for persistence (fire-and-forget via background task)
    if is_cloudsql_enabled():
        # Cloud SQL (Cloud Run): sync insert via background task
        def _save_cloudsql():
            try:
                cloudsql_insert_screening(
                    screening_id=result["screening_id"],
                    child_age_months=age,
                    domain=domain,
                    observations=observations_clean,
                    image_path=saved_path,
                    report=result["report"],
                )
            except Exception as e:
                logger.error(f"Failed to save screening to Cloud SQL: {e}")
        background_tasks.add_task(_save_cloudsql)
    else:
        # MongoDB (local dev)
        db = get_db()
        screening_doc = {
            "screening_id": result["screening_id"],
            "childAge": age,
            "domain": domain,
            "observations": observations_clean,
            "image_path": saved_path,
            "report": result["report"],
            "timestamp": result.get("timestamp", int(datetime.utcnow().timestamp()))
        }
        async def _save_doc(doc):
            try:
                await db.screenings.insert_one(doc)
            except Exception as e:
                logger.error(f"Failed to save screening doc: {e}")
        background_tasks.add_task(_save_doc, screening_doc)

    # schedule removing the image from local disk after a short lifetime (privacy)
    if saved_path:
        def _cleanup(p):
            remove_file(p)
        # cleanup after response (background)
        background_tasks.add_task(_cleanup, saved_path)

    return result
