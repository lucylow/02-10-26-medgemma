# backend/app/api/infer.py
"""
Privacy-first inference endpoint for precomputed embeddings (design spec Section 16.1).
Accepts embedding_b64 + metadata; raw images never leave device.
Returns structured InferenceExplainable for AI explainability & trust.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logger import logger
from app.core.security import get_api_key
from app.errors import ApiError, ErrorCodes, ErrorResponse
from app.services.medgemma_service import MedGemmaService

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
    api_key: str = Depends(get_api_key),
):
    """
    Run MedGemma inference with precomputed image embedding.
    Privacy-first: raw images never leave device; client sends L2-normalized embedding only.
    Returns structured result with full provenance and explainability (reasoning_chain, evidence, confidence).
    """
    svc = _get_medgemma_svc()
    if not svc:
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
        # Audit log for explainability & accountability (Page 10)
        try:
            from app.services.audit import write_audit
            prov = result.get("provenance", {})
            res = result.get("result", {})
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
        return result
    except ValueError as e:
        raise ApiError(
            ErrorCodes.EMBEDDING_PARSE_ERROR,
            str(e),
            status_code=400,
            details={"hint": "Check embedding_b64 and shape match expected format"},
        ) from e
    except Exception as e:
        logger.exception("Infer failed: %s", e)
        raise ApiError(
            ErrorCodes.INFERENCE_FAILED,
            "Model inference failed",
            status_code=500,
            details={"error": str(e)} if settings.DEBUG else None,
        ) from e
