# backend/app/api/analyze.py
import time
import uuid
from typing import Optional

from fastapi import APIRouter, File, UploadFile, Form, Depends, BackgroundTasks, Request
from datetime import datetime

from app.core.config import settings
from app.core.logger import logger
from app.core.request_id_middleware import get_request_id
from app.core.security import get_api_key
from app.errors import ApiError, ErrorCodes
from app.models.schemas import AnalyzeResponse
from app.schemas.health_data import ScreeningInput
from app.services.db import get_db
from app.services.db_cloudsql import is_cloudsql_enabled, insert_screening_record as cloudsql_insert_screening
from app.services.feedback_store import insert_inference
from app.services.medgemma_service import MedGemmaService
from app.services.model_wrapper import analyze as run_analysis
from app.services.phi_redactor import redact_text
from app.services.storage import save_upload, remove_file
from app.telemetry.emitter import build_ai_event_envelope, emit_ai_event

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


def _medgemma_report_to_response(
    analysis_result: dict, age: int, domain: str, screening_id: str, inference_id: str | None = None
) -> dict:
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
    result = {
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
    # Page 4: Hook inference response with feedback UI flag
    if inference_id:
        result["inference_id"] = inference_id
        result["feedback_allowed"] = True
        result["feedback_url"] = f"/api/feedback/inference/{inference_id}"
    return result


@router.post("/api/analyze", response_model=AnalyzeResponse, status_code=200, dependencies=[Depends(get_api_key)])
async def analyze_endpoint(
    request: Request,
    background_tasks: BackgroundTasks,
    childAge: str = Form(...),
    domain: str = Form(""),
    observations: str = Form(""),
    image: UploadFile | None = File(None),
    consent_id: str | None = Form(None),
    consent_given: str | None = Form(None),
):
    # Embeddings-first: raw image requires explicit consent (Page 3)
    if image:
        if consent_given != "true" or not consent_id:
            raise ApiError(
                ErrorCodes.INVALID_PAYLOAD,
                "raw_image requires explicit consent. Provide consent_id and consent_given=true.",
                status_code=400,
                details={"hint": "Use embeddings-first flow or record consent via POST /api/consent first"},
            ) from None

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
    request_id = get_request_id(request)
    start_ns = time.perf_counter_ns()
    org_id = "default"
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
            inference_id = str(uuid.uuid4())
            prov = analysis_result.get("provenance", {})
            insert_inference(
                inference_id=inference_id,
                case_id=screening_id,
                screening_id=screening_id,
                input_hash=prov.get("input_hash") or prov.get("prompt_hash"),
                result_summary=str(analysis_result.get("report", {}).get("clinical_summary", ""))[:500],
                result_risk=analysis_result.get("report", {}).get("riskLevel"),
            )
            result = _medgemma_report_to_response(analysis_result, age, domain, screening_id, inference_id)
            latency_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
            emit_ai_event(build_ai_event_envelope(
                request_id=request_id,
                endpoint="analyze",
                model_name=prov.get("base_model_id", prov.get("model_id", "medgemma")),
                org_id=org_id,
                latency_ms=latency_ms,
                success=True,
                provenance=prov,
                consent=bool(consent_id and consent_given),
            ))
        else:
            result = await run_analysis(child_age_months=age, domain=domain, observations=observations_clean, image_path=saved_path)
            screening_id = result.get("screening_id", f"ps-{int(time.time())}-{uuid.uuid4().hex[:8]}")
            inference_id = str(uuid.uuid4())
            rep = result.get("report", {})
            insert_inference(
                inference_id=inference_id,
                case_id=screening_id,
                screening_id=screening_id,
                input_hash=None,
                result_summary=str(rep.get("clinical_summary", rep.get("summary", "")))[:500],
                result_risk=rep.get("riskLevel"),
            )
            result["inference_id"] = inference_id
            result["feedback_allowed"] = True
            result["feedback_url"] = f"/api/feedback/inference/{inference_id}"
            latency_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
            emit_ai_event(build_ai_event_envelope(
                request_id=request_id,
                endpoint="analyze",
                model_name="model_wrapper" if result.get("model_used") else "baseline",
                org_id=org_id,
                latency_ms=latency_ms,
                success=True,
                fallback_used=not result.get("model_used", True),
                consent=bool(consent_id and consent_given),
            ))
    except Exception as e:
        logger.error(f"Analysis failure: {e}")
        latency_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
        emit_ai_event(build_ai_event_envelope(
            request_id=request_id,
            endpoint="analyze",
            model_name="medgemma",
            org_id=org_id,
            latency_ms=latency_ms,
            success=False,
            error_code=ErrorCodes.ANALYSIS_FAILED,
            error_message=str(e)[:1000],
            consent=bool(consent_id and consent_given),
        ))
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


@router.post("/api/screening", response_model=AnalyzeResponse, status_code=200, dependencies=[Depends(get_api_key)])
async def screening_endpoint(
    input: ScreeningInput,
    background_tasks: BackgroundTasks,
):
    """
    Submit screening with strongly-typed ScreeningInput (JSON).
    Uses same analysis flow as /api/analyze but accepts structured schema.
    For image uploads, use POST /api/analyze (multipart/form-data).
    """
    age = input.child_age_months
    domain = input.domain or "communication"
    observations = input.observations or ""

    redaction_result = redact_text(observations)
    observations_clean = redaction_result["redacted_text"]

    medgemma_svc = _get_medgemma_svc()
    try:
        if medgemma_svc:
            analysis_result = await medgemma_svc.analyze_input(
                age_months=age,
                domain=domain,
                observations=observations_clean,
                image_bytes=None,
                image_filename=None,
            )
            screening_id = f"ps-{int(time.time())}-{uuid.uuid4().hex[:8]}"
            inference_id = str(uuid.uuid4())
            prov = analysis_result.get("provenance", {})
            insert_inference(
                inference_id=inference_id,
                case_id=screening_id,
                screening_id=screening_id,
                input_hash=prov.get("input_hash") or prov.get("prompt_hash"),
                result_summary=str(analysis_result.get("report", {}).get("clinical_summary", ""))[:500],
                result_risk=analysis_result.get("report", {}).get("riskLevel"),
            )
            result = _medgemma_report_to_response(analysis_result, age, domain, screening_id, inference_id)
        else:
            result = await run_analysis(
                child_age_months=age,
                domain=domain,
                observations=observations_clean,
                image_path=None,
            )
            screening_id = result.get("screening_id", f"ps-{int(time.time())}-{uuid.uuid4().hex[:8]}")
            inference_id = str(uuid.uuid4())
            rep = result.get("report", {})
            insert_inference(
                inference_id=inference_id,
                case_id=screening_id,
                screening_id=screening_id,
                input_hash=None,
                result_summary=str(rep.get("clinical_summary", rep.get("summary", "")))[:500],
                result_risk=rep.get("riskLevel"),
            )
            result["inference_id"] = inference_id
            result["feedback_allowed"] = True
            result["feedback_url"] = f"/api/feedback/inference/{inference_id}"
    except Exception as e:
        logger.error(f"Screening analysis failure: {e}")
        raise ApiError(
            ErrorCodes.ANALYSIS_FAILED,
            "Analysis failed",
            status_code=500,
            details={"error": str(e)} if settings.DEBUG else None,
        ) from e

    if is_cloudsql_enabled():
        def _save_cloudsql():
            try:
                cloudsql_insert_screening(
                    screening_id=result["screening_id"],
                    child_age_months=age,
                    domain=domain,
                    observations=observations_clean,
                    image_path=None,
                    report=result["report"],
                )
            except Exception as e:
                logger.error(f"Failed to save screening to Cloud SQL: {e}")
        background_tasks.add_task(_save_cloudsql)
    else:
        db = get_db()
        screening_doc = {
            "screening_id": result["screening_id"],
            "childAge": age,
            "domain": domain,
            "observations": observations_clean,
            "image_path": None,
            "report": result["report"],
            "timestamp": result.get("timestamp", int(datetime.utcnow().timestamp())),
            "questionnaire_scores": input.questionnaire_scores.dict() if input.questionnaire_scores is not None else None,
            "consent_id": input.consent_id,
        }

        async def _save_doc(doc):
            try:
                await db.screenings.insert_one(doc)
            except Exception as e:
                logger.error(f"Failed to save screening doc: {e}")
        background_tasks.add_task(_save_doc, screening_doc)

    return result
