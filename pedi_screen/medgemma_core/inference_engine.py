"""
Inference engine — input → mediator → output pipeline.
Delegates to backend MedGemmaService when available; provides adapter management.
Includes run_inference with retries, deterministic mock fallback, and audit logging.
"""
import hashlib
import logging
import os
import sys
from typing import Any, Dict, List, Optional

# Allow import from backend when running in project context
_backend_path = os.path.join(os.path.dirname(__file__), "..", "..", "backend")
if os.path.isdir(_backend_path) and _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)

logger = logging.getLogger("inference")


class InferenceError(Exception):
    """Raised when inference fails after retries."""


def deterministic_seed(case_id: str) -> bytes:
    """Stable seed from case_id for reproducible mock output."""
    return hashlib.sha256(case_id.encode()).digest()


def _log_audit_safe(
    request_id: str,
    case_id: str,
    model_id: str,
    adapter_id: str,
    emb_version: str,
    success: bool,
    fallback_used: bool,
    error_msg: Optional[str] = None,
) -> None:
    try:
        from monitoring.audit import log_audit
        log_audit(
            request_id=request_id,
            case_id=case_id,
            model_id=model_id,
            adapter_id=adapter_id or "",
            emb_version=emb_version or "unknown",
            success=success,
            fallback_used=fallback_used,
            error_msg=error_msg,
        )
    except Exception as e:
        logger.warning("Audit log_audit failed: %s", e)


def mock_inference(
    case_id: str,
    image_bytes: Any = None,
    text: str = "",
    metadata: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Deterministic mock result for demos and degraded mode.
    Same case_id always yields same risk/summary/recommendations.
    """
    seed = deterministic_seed(case_id)
    risks = ["low", "monitor", "high", "refer"]
    idx = seed[0] % len(risks)
    risk = risks[idx]
    return {
        "summary": [f"Mock summary for {case_id}."],
        "risk": risk,
        "recommendations": (
            ["Return for recheck in 3 months"] if risk != "low" else ["Continue routine monitoring"]
        ),
        "explain": "Model unavailable; returned mock result.",
        "confidence": 0.5,
        "evidence": [],
        "reasoning_chain": ["Mock fallback used."],
        "model_provenance": {"note": "mock_fallback"},
    }


class InferenceEngine:
    """
    Inference pipeline: load model, run inference, return structured output.
    Uses backend MedGemmaService when backend is available.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self._service = None

    def _get_service(self):
        """Lazy-load MedGemmaService from backend if configured."""
        if self._service is not None:
            return self._service
        try:
            from app.core.config import settings
            from app.services.medgemma_service import MedGemmaService

            if (settings.HF_MODEL and settings.HF_API_KEY) or (
                settings.VERTEX_PROJECT and settings.VERTEX_LOCATION
            ):
                self._service = MedGemmaService({
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
        except Exception:
            self._service = None
        return self._service

    async def infer(
        self,
        case_id: str,
        age_months: int,
        observations: str,
        embedding_b64: str,
        shape: List[int] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Run inference with precomputed embedding.
        Returns result dict with provenance.
        """
        shape = shape or [1, 256]
        svc = self._get_service()
        if not svc:
            return await self._fallback_inference(case_id, age_months, observations, **kwargs)
        return await svc.infer_with_precomputed_embedding(
            case_id=case_id,
            age_months=age_months,
            observations=observations,
            embedding_b64=embedding_b64,
            shape=shape,
            **kwargs,
        )

    async def _fallback_inference(
        self, case_id: str, age_months: int, observations: str, **kwargs
    ) -> Dict[str, Any]:
        """Deterministic baseline when no model is configured; uses mock_inference."""
        mock = mock_inference(case_id, text=observations, metadata=kwargs)
        return {
            "case_id": case_id,
            "result": {
                "summary": mock.get("summary", ["No model configured; baseline analysis only."]),
                "risk": mock.get("risk", "monitor"),
                "recommendations": mock.get("recommendations", ["Configure HF_MODEL+HF_API_KEY or Vertex for full inference."]),
                "parent_text": "",
                "explain": mock.get("explain", "Baseline fallback."),
                "confidence": mock.get("confidence", 0.5),
                "evidence": mock.get("evidence", []),
                "reasoning_chain": mock.get("reasoning_chain", ["Model not loaded; using fallback."]),
                "model_provenance": mock.get("model_provenance", {"note": "fallback"}),
            },
            "provenance": {"note": "fallback"},
            "inference_time_ms": 0,
        }
