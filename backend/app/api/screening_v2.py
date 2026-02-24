"""
HAI-DEF production screening API: POST /v2/screening.
Multi-adapter ensemble, clinical safety guard, Prometheus metrics, audit logging.
"""
import time
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from app.core.config import settings
from app.core.logger import logger
from app.core.request_id_middleware import get_request_id
from app.core.security import get_api_key
from app.errors import ApiError, ErrorCodes, ErrorResponse, SafetyViolation
from app.schemas.pediatric import RiskOutput, ScreeningInput
from app.core.model_router import HAIAdapterRouter
from app.middleware.safety import ClinicalSafetyGuard
from app.telemetry.emitter import build_ai_event_envelope, emit_ai_event

router = APIRouter(prefix="/v2", tags=["HAI-DEF Screening"])

_responses = {
    400: {"model": ErrorResponse, "description": "Invalid payload or prompt injection"},
    422: {"model": ErrorResponse, "description": "Validation or safety violation"},
    500: {"model": ErrorResponse, "description": "Inference failed"},
}

_router: Optional[HAIAdapterRouter] = None
_safety_guard: Optional[ClinicalSafetyGuard] = None


def _get_router() -> HAIAdapterRouter:
    global _router
    if _router is None:
        _router = HAIAdapterRouter()
    return _router


def _get_safety_guard() -> ClinicalSafetyGuard:
    global _safety_guard
    if _safety_guard is None:
        _safety_guard = ClinicalSafetyGuard()
    return _safety_guard


# HAI-DEF Prometheus metrics (lazy)
_HAI_INFERENCE_COUNTER = None
_HAI_LATENCY_HISTOGRAM = None


def _hai_metrics():
    global _HAI_INFERENCE_COUNTER, _HAI_LATENCY_HISTOGRAM
    if _HAI_INFERENCE_COUNTER is None:
        try:
            from prometheus_client import Counter, Histogram
            _HAI_INFERENCE_COUNTER = Counter(
                "hai_def_screening_requests_total",
                "HAI-DEF screening requests",
                ["adapter_id", "risk_level", "domain"],
            )
            _HAI_LATENCY_HISTOGRAM = Histogram(
                "hai_def_screening_latency_seconds",
                "HAI-DEF screening latency",
                ["adapter_id"],
                buckets=(0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0),
            )
        except ImportError:
            pass
    return _HAI_INFERENCE_COUNTER, _HAI_LATENCY_HISTOGRAM


def _log_screening_audit(screening: ScreeningInput, result: RiskOutput) -> None:
    """Background: log screening to audit (Supabase/file). Best-effort."""
    try:
        from app.services.audit import write_audit
        write_audit(
            action="v2_screening",
            actor=screening.chw_id,
            target="screening",
            payload={
                "child_age_months": screening.child_age_months,
                "domain_focus": screening.domain_focus,
                "risk_level": result.risk_level,
                "confidence": result.confidence,
                "adapter_ensemble": result.adapter_ensemble,
            },
        )
    except Exception as e:
        logger.warning("Screening audit write failed: %s", e)


@router.post("/screening", response_model=RiskOutput, responses=_responses)
async def screen_child(
    screening: ScreeningInput,
    request: Request,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(get_api_key),
):
    """
    HAI-DEF pediatric screening: ASQ-3 + optional embedding → ensemble → safety guard → RiskOutput.
    """
    request_id = get_request_id(request)
    org_id = getattr(request.state, "org_id", None) or "default"
    counter, hist = _hai_metrics()

    if counter:
        counter.labels(adapter_id="ensemble", risk_level="pending", domain=screening.domain_focus).inc()

    start = time.perf_counter()

    # Prompt injection defense
    guard = _get_safety_guard()
    if not guard.prompt_injection_defense(screening.parental_concerns or ""):
        raise ApiError(
            ErrorCodes.INVALID_PAYLOAD,
            "Potential prompt injection detected",
            status_code=400,
        )

    try:
        router_instance = _get_router()
        result = router_instance.ensemble_predict(screening, request_id=request_id)

        # Final safety validation
        await guard.validate_output(screening, result)

        elapsed = time.perf_counter() - start
        if hist:
            hist.labels(adapter_id="ensemble").observe(elapsed)
        if counter:
            counter.labels(
                adapter_id="ensemble",
                risk_level=result.risk_level,
                domain=screening.domain_focus,
            ).inc()

        background_tasks.add_task(_log_screening_audit, screening, result)

        emit_ai_event(
            build_ai_event_envelope(
                request_id=request_id,
                endpoint="v2_screening",
                model_name="hai_def_ensemble",
                org_id=org_id,
                user_id=screening.chw_id,
                adapter_id="ensemble",
                latency_ms=int(elapsed * 1000),
                success=True,
                provenance={"risk_level": result.risk_level, "adapters": result.adapter_ensemble},
                consent=screening.consent_given,
            )
        )

        return result

    except SafetyViolation as sv:
        logger.error("Safety violation: %s", sv)
        emit_ai_event(
            build_ai_event_envelope(
                request_id=request_id,
                endpoint="v2_screening",
                model_name="hai_def_ensemble",
                org_id=org_id,
                user_id=screening.chw_id,
                latency_ms=int((time.perf_counter() - start) * 1000),
                success=False,
                error_code=ErrorCodes.SAFETY_VIOLATION,
                error_message=f"{sv.violation_type}: {sv.mitigation_applied}",
                consent=screening.consent_given,
            )
        )
        raise ApiError(
            ErrorCodes.SAFETY_VIOLATION,
            f"Safety violation: {sv.violation_type}",
            status_code=422,
            details={"severity": sv.severity, "mitigation_applied": sv.mitigation_applied},
        )
    except Exception as e:
        logger.exception("v2/screening failed: %s", e)
        emit_ai_event(
            build_ai_event_envelope(
                request_id=request_id,
                endpoint="v2_screening",
                model_name="hai_def_ensemble",
                org_id=org_id,
                user_id=screening.chw_id,
                latency_ms=int((time.perf_counter() - start) * 1000),
                success=False,
                error_code=ErrorCodes.INFERENCE_FAILED,
                error_message=str(e)[:500],
                consent=screening.consent_given,
            )
        )
        raise ApiError(
            ErrorCodes.INFERENCE_FAILED,
            "Screening inference failed",
            status_code=500,
            details={"error": str(e)} if getattr(settings, "DEBUG", False) else None,
        )
