# backend/app/api/infer.py
"""
Privacy-first inference endpoint for precomputed embeddings (design spec Section 16.1).
Accepts embedding_b64 + metadata; raw images never leave device.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logger import logger
from app.core.security import get_api_key
from app.services.medgemma_service import MedGemmaService

router = APIRouter(prefix="/api", tags=["MedGemma Inference"])

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


@router.post("/infer")
async def infer_endpoint(
    req: InferRequest,
    api_key: str = Depends(get_api_key),
):
    """
    Run MedGemma inference with precomputed image embedding.
    Privacy-first: raw images never leave device; client sends L2-normalized embedding only.
    Returns structured result with full provenance (adapter_id, base_model_id, input_hash, inference_time_ms).
    """
    svc = _get_medgemma_svc()
    if not svc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MedGemma not configured (HF_MODEL+HF_API_KEY or Vertex required)",
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
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.exception("Infer failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="inference_failed",
        ) from e
