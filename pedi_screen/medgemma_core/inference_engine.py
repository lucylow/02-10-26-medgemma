"""
Inference engine — input → mediator → output pipeline.
Delegates to backend MedGemmaService when available; provides adapter management.
"""
import os
import sys
from typing import Any, Dict, List, Optional

# Allow import from backend when running in project context
_backend_path = os.path.join(os.path.dirname(__file__), "..", "..", "backend")
if os.path.isdir(_backend_path) and _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)


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
        """Deterministic baseline when no model is configured."""
        return {
            "case_id": case_id,
            "result": {
                "summary": ["No model configured; baseline analysis only."],
                "risk": "monitor",
                "recommendations": ["Configure HF_MODEL+HF_API_KEY or Vertex for full inference."],
                "parent_text": "",
                "explain": "Baseline fallback.",
                "confidence": 0.5,
                "evidence": [],
                "reasoning_chain": ["Model not loaded; using fallback."],
                "model_provenance": {"note": "fallback"},
            },
            "provenance": {"note": "fallback"},
            "inference_time_ms": 0,
        }
