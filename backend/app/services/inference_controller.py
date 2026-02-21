"""
Inference controller: Embedding -> Model (from registry) -> MCP tools -> Post-process -> Audit.
Uses MODEL_BACKEND to select model; runs orchestrator pipeline.
"""
import asyncio
import logging
import time
from typing import Any, Dict, Optional

from app.core.config import settings
from app.models import get_registry, register_default_models, MockEmbeddingModel
from app.models.post_processor import fallback_response
from app.mcp import create_default_registry, MCPOrchestrator
from app.schemas.explainability_structured import ensure_explainability_in_output
from app.calibration import apply_calibration
from app.services.audit import log_inference_audit_expanded

logger = logging.getLogger(__name__)

# One-time init
_registry = None
_orchestrator = None
_embedding_model = None

INFERENCE_TIMEOUT_S = 5.0
MAX_RETRIES = 2


def _get_registry():
    global _registry
    if _registry is None:
        _registry = get_registry()
        register_default_models(_registry)
    return _registry


def _get_orchestrator():
    global _orchestrator
    if _orchestrator is None:
        reg = _get_registry()
        backend = getattr(settings, "MODEL_BACKEND", "mock") or "mock"
        model = reg.get_or_default(backend)
        tool_reg = create_default_registry()
        _orchestrator = MCPOrchestrator(model, tool_reg)
    return _orchestrator


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = MockEmbeddingModel()
    return _embedding_model


def run_inference_sync(
    case_id: str,
    age_months: int,
    observations: str,
    embedding_b64: str,
    shape: Optional[list] = None,
    emb_version: str = "medsiglip-v1",
    request_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run full pipeline: optional embed -> model -> tools -> post-process -> calibration -> audit.
    Sync wrapper; respects timeout and retries.
    """
    request_id = request_id or ""
    shape = shape or [1, 256]
    input_data = {
        "case_id": case_id,
        "age_months": age_months,
        "observations": (observations or "")[:5000],  # input cap PAGE 16
        "embedding_b64": embedding_b64,
        "shape": shape,
        "emb_version": emb_version,
    }
    start = time.perf_counter()
    try:
        orch = _get_orchestrator()
        for attempt in range(MAX_RETRIES + 1):
            try:
                result = asyncio.run(
                    asyncio.wait_for(
                        asyncio.to_thread(orch.run_pipeline, input_data),
                        timeout=INFERENCE_TIMEOUT_S,
                    )
                )
                break
            except asyncio.TimeoutError:
                if attempt == MAX_RETRIES:
                    result = fallback_response("Model timeout")
                    result["fallback"] = True
                    break
                continue
            except Exception as e:
                if attempt == MAX_RETRIES:
                    result = fallback_response(str(e))
                    result["fallback"] = True
                    break
                logger.warning("Inference attempt %s failed: %s", attempt + 1, e)
                continue
        result = apply_calibration(result)
        result = ensure_explainability_in_output(result)
        result = ensure_hai_structured_output(result)
        result["case_id"] = case_id
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        result["inference_time_ms"] = elapsed_ms
        # Audit
        log_inference_audit_expanded(
            request_id=request_id,
            case_id=case_id,
            model_id=result.get("model_id"),
            adapter_id=result.get("adapter_id"),
            prompt_version=result.get("prompt_version"),
            tool_chain=result.get("tool_chain"),
            confidence=result.get("confidence"),
            clinician_override=False,
            success=True,
            fallback_used=result.get("fallback", False),
        )
        return result
    except Exception as e:
        logger.exception("Inference controller failed: %s", e)
        log_inference_audit_expanded(
            request_id=request_id,
            case_id=case_id,
            model_id="",
            success=False,
            error_msg=str(e),
        )
        return {
            **fallback_response("Internal error"),
            "case_id": case_id,
            "inference_time_ms": int((time.perf_counter() - start) * 1000),
        }
