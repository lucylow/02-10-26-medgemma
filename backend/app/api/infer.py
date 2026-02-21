# backend/app/api/infer.py
"""
Privacy-first inference endpoint for precomputed embeddings (design spec Section 16.1).
Accepts embedding_b64 + metadata; raw images never leave device.
Returns structured InferenceExplainable for AI explainability & trust.
"""
import time
import uuid
from typing import Any, Dict, List, Optional  # noqa: F401 Dict used in _mock_inference

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logger import logger
from app.core.security import get_api_key
from app.core.request_id_middleware import get_request_id
from app.errors import ApiError, ErrorCodes, ErrorResponse
from app.services.medgemma_service import MedGemmaService
from app.services.feedback_store import insert_inference
from app.services.audit import log_inference_audit
from app.telemetry.emitter import build_ai_event_envelope, emit_ai_event

router = APIRouter(prefix="/api", tags=["MedGemma Inference"])

# OpenAPI error responses
_infer_responses = {
    400: {"model": ErrorResponse, "description": "Invalid payload or embedding (EMBEDDING_PARSE_ERROR)"},
    422: {"model": ErrorResponse, "description": "Validation error (VALIDATION_ERROR)"},
    500: {"model": ErrorResponse, "description": "Inference failed (INFERENCE_FAILED)"},
    503: {"model": ErrorResponse, "description": "Model not configured (MODEL_LOAD_FAIL)"},
}

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
            "LORA_ADAPTER_PATH": settings.LORA_ADAPTER_PATH,
            "BASE_MODEL_ID": settings.BASE_MODEL_ID,
        })
    return _medgemma_svc


class InferRequest(BaseModel):
    """Canonical contract for embedding-based inference (design spec 4.3, 16.1)."""
    case_id: str = Field(..., description="Unique case identifier")
    age_months: int = Field(..., ge=0, le=240, description="Child age in months")
    observations: str = Field("", description="Caregiver observations / questionnaire context")
    embedding_b64: str = Field(..., description="Base64-encoded float32 embedding bytes")
    shape: List[int] = Field(default=[1, 256], description="Embedding shape, e.g. [1, 256]")
    emb_version: str = Field("medsiglip-v1", description="Encoder version for traceability")
    consent_id: Optional[str] = Field(None, description="Consent record ID for audit")
    user_id_pseudonym: Optional[str] = Field(None, description="Pseudonymized user ID")


@router.post("/infer", responses=_infer_responses)
async def infer_endpoint(
    req: InferRequest,
    request: Request,
    api_key: str = Depends(get_api_key),
):
    """
    Run MedGemma inference with precomputed image embedding.
    Privacy-first: raw images never leave device; client sends L2-normalized embedding only.
    Returns structured result with full provenance and explainability (reasoning_chain, evidence, confidence).
    """
    request_id = get_request_id(request)
    svc = _get_medgemma_svc()
    if not svc:
        if getattr(settings, "MOCK_FALLBACK", True):
            mock = _mock_inference(req.case_id)
            log_inference_audit(
                request_id=request_id,
                case_id=req.case_id,
                model_id="",
                adapter_id="",
                emb_version=req.emb_version,
                success=True,
                fallback_used=True,
            )
            return {
                "case_id": req.case_id,
                "result": {
                    "summary": mock.get("summary", []),
                    "risk": mock.get("risk", "monitor"),
                    "recommendations": mock.get("recommendations", []),
                    "explain": mock.get("explain", ""),
                    "confidence": mock.get("confidence", 0.5),
                    "evidence": mock.get("evidence", []),
                    "reasoning_chain": mock.get("reasoning_chain", []),
                    "model_provenance": mock.get("model_provenance", {}),
                },
                "provenance": {"note": "mock_fallback"},
                "inference_time_ms": 0,
                "fallback_used": True,
            }
        log_inference_audit(
            request_id=request_id,
            case_id=req.case_id,
            model_id="",
            adapter_id="",
            emb_version=req.emb_version,
            success=False,
            fallback_used=True,
            error_msg="MedGemma not configured",
        )
        raise ApiError(
            ErrorCodes.MODEL_LOAD_FAIL,
            "MedGemma not configured (HF_MODEL+HF_API_KEY or Vertex required)",
            status_code=503,
        )
    try:
        result = await svc.infer_with_precomputed_embedding(
            case_id=req.case_id,
            age_months=req.age_months,
            observations=req.observations,
            embedding_b64=req.embedding_b64,
            shape=req.shape,
            emb_version=req.emb_version,
            consent_id=req.consent_id,
            user_id_pseudonym=req.user_id_pseudonym,
        )
        prov = result.get("provenance", {})
        res = result.get("result", {})
        log_inference_audit(
            request_id=request_id,
            case_id=req.case_id,
            model_id=prov.get("base_model_id", prov.get("model_id", "")),
            adapter_id=prov.get("adapter_id", ""),
            emb_version=req.emb_version,
            success=True,
            fallback_used=False,
        )
        # Legacy audit log for explainability & accountability
        try:
            from app.services.audit import write_audit
            write_audit(
                action="inference_run",
                actor=req.user_id_pseudonym or api_key[:8] + "..." if api_key else "api",
                target=req.case_id,
                payload={
                    "event_type": "inference_run",
                    "inference_id": prov.get("input_hash", ""),
                    "case_id": req.case_id,
                    "risk": res.get("risk") or res.get("riskLevel"),
                    "confidence": res.get("confidence"),
                    "reasoning_chain_hashes": [
                        str(hash(s)) for s in res.get("reasoning_chain", [])
                    ][:10],
                    "adapter_id": prov.get("adapter_id"),
                    "model_id": prov.get("base_model_id", prov.get("model_id")),
                    "evidence_refs": [
                        e.get("reference_ids", []) if isinstance(e, dict) else []
                        for e in res.get("evidence", [])
                    ],
                    "inference_time_ms": result.get("inference_time_ms"),
                },
            )
        except Exception as audit_err:
            logger.warning("Audit log write failed: %s", audit_err)
        # Page 4: Hook inference response with feedback UI flag
        inference_id = str(uuid.uuid4())
        prov = result.get("provenance", {})
        res = result.get("result", {})
        try:
            insert_inference(
                inference_id=inference_id,
                case_id=req.case_id,
                screening_id=None,
                input_hash=prov.get("input_hash"),
                result_summary=(
                    " ".join(res.get("summary", []))[:500]
                    if isinstance(res.get("summary"), list)
                    else str(res.get("summary", ""))[:500]
                ),
                result_risk=res.get("risk"),
            )
        except Exception as e:
            logger.warning("Failed to insert inference for feedback: %s", e)
        result["inference_id"] = inference_id
        result["feedback_allowed"] = True
        result["feedback_url"] = f"/api/feedback/inference/{inference_id}"
        latency_ms = result.get("inference_time_ms") or int((time.perf_counter_ns() - start_ns) / 1_000_000)
        emit_ai_event(build_ai_event_envelope(
            request_id=request_id,
            endpoint="infer",
            model_name=prov.get("base_model_id", prov.get("model_id", "medgemma")),
            org_id=org_id,
            user_id=req.user_id_pseudonym,
            model_version=prov.get("model_version"),
            adapter_id=prov.get("adapter_id"),
            latency_ms=latency_ms,
            compute_ms=result.get("compute_ms"),
            cost_usd=result.get("cost_usd", 0.0),
            success=True,
            fallback_used=result.get("fallback_used", False),
            fallback_model=result.get("fallback_model"),
            provenance=prov,
            consent=bool(req.consent_id),
        ))
        return result
    except ValueError as e:
        latency_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
        emit_ai_event(build_ai_event_envelope(
            request_id=request_id,
            endpoint="infer",
            model_name="medgemma",
            org_id=org_id,
            user_id=req.user_id_pseudonym,
            latency_ms=latency_ms,
            success=False,
            error_code=ErrorCodes.EMBEDDING_PARSE_ERROR,
            error_message=str(e)[:1000],
            consent=bool(req.consent_id),
        ))
        raise ApiError(
            ErrorCodes.EMBEDDING_PARSE_ERROR,
            str(e),
            status_code=400,
            details={"hint": "Check embedding_b64 and shape match expected format"},
        ) from e
    except Exception as e:
        latency_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
        emit_ai_event(build_ai_event_envelope(
            request_id=request_id,
            endpoint="infer",
            model_name=getattr(settings, "BASE_MODEL_ID", "medgemma") or "medgemma",
            org_id=org_id,
            user_id=req.user_id_pseudonym,
            latency_ms=latency_ms,
            success=False,
            error_code=ErrorCodes.INFERENCE_FAILED,
            error_message=str(e)[:1000],
            consent=bool(req.consent_id),
        ))
        logger.exception("Infer failed: %s", e)
        raise ApiError(
            ErrorCodes.INFERENCE_FAILED,
            "Model inference failed",
            status_code=500,
            details={"error": str(e)} if settings.DEBUG else None,
        ) from e
