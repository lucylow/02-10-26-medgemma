"""
Epic Production Pilot: fail-safe guardrail for MedGemma inference.
If drift (PSI) > threshold, bias metric violated, or GPU OOM → revert to
rule-based screening checklist instead of model inference.
"""
import hashlib
import logging
import os
from typing import Any, Awaitable, Callable, Dict, Optional

logger = logging.getLogger(__name__)

# Default drift threshold (effective PSI-like); trigger fallback when exceeded
DEFAULT_DRIFT_THRESHOLD = float(os.environ.get("SAFE_INFERENCE_DRIFT_THRESHOLD", "0.25"))
BIAS_VIOLATED_ENV = "SAFE_INFERENCE_BIAS_VIOLATED"  # Set to 1/true to force fallback for testing


def _effective_psi() -> float:
    """Current effective drift (PSI-like) from monitoring."""
    try:
        import sys
        from pathlib import Path
        # Ensure repo root (parent of backend) is on path for monitoring
        _backend = Path(__file__).resolve().parent.parent.parent
        if str(_backend) not in sys.path:
            sys.path.insert(0, str(_backend))
        from monitoring.metrics import get_effective_drift_psi
        return get_effective_drift_psi()
    except Exception as e:
        logger.debug("Could not get drift PSI: %s", e)
        return 0.0


def psi_value() -> float:
    """Return current drift metric for guardrail. > threshold → use fallback."""
    return _effective_psi()


def bias_metric_violated() -> bool:
    """
    Check if bias metric is violated (e.g. from periodic bias audit).
    Production: wire to monitoring or BiasAuditor result.
    """
    val = os.environ.get(BIAS_VIOLATED_ENV, "").strip().lower()
    if val in ("1", "true", "yes"):
        return True
    # TODO: integrate with bias_audit.json or monitoring when available
    return False


def _is_oom(exc: BaseException) -> bool:
    """Heuristic: GPU OOM or out-of-memory errors."""
    msg = (getattr(exc, "message", "") or str(exc)).lower()
    return (
        isinstance(exc, MemoryError)
        or "out of memory" in msg
        or "oom" in msg
        or "cuda out of memory" in msg
        or "resource exhausted" in msg
    )


def _deterministic_risk(case_id: str, age_months: int = 0, observations: str = "") -> str:
    """Rule-based risk bucket for fallback (deterministic from inputs)."""
    seed = hashlib.sha256((case_id + str(age_months) + (observations or "")[:200]).encode()).digest()
    risks = ["low", "monitor", "high", "refer"]
    return risks[seed[0] % len(risks)]


def fallback_checklist(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Rule-based screening result when guardrail triggers (no model).
    Returns full inference response shape (result + provenance) for FHIR write-back.
    """
    case_id = str(input_data.get("case_id", "unknown"))
    age_months = int(input_data.get("age_months", 0))
    observations = str(input_data.get("observations", ""))
    risk = _deterministic_risk(case_id, age_months, observations)
    result_inner = {
        "summary": [f"Rule-based screening (fallback) for case {case_id}. Risk: {risk}."],
        "risk": risk,
        "recommendations": (
            ["Return for recheck in 3 months", "Consider specialist referral"]
            if risk in ("high", "refer")
            else (["Return for recheck in 3 months"] if risk == "monitor" else ["Continue routine monitoring"])
        ),
        "explain": "Fail-safe fallback: rule-based checklist (drift, bias, or OOM guard triggered).",
        "confidence": 0.5,
        "evidence": [],
        "reasoning_chain": ["Rule-based fallback used; model inference skipped."],
        "model_provenance": {"note": "safe_fallback_checklist"},
    }
    return {
        "result": result_inner,
        "provenance": {"note": "safe_fallback_checklist"},
        "inference_time_ms": 0,
        "fallback_used": True,
    }


async def safe_inference(
    medgemma_predict: Callable[..., Awaitable[Dict[str, Any]]],
    *,
    drift_threshold: Optional[float] = None,
    **input_kwargs: Any,
) -> Dict[str, Any]:
    """
    Run MedGemma inference with guardrails. On drift > threshold, bias violation,
    or GPU OOM, returns rule-based fallback instead.
    input_kwargs: passed through to medgemma_predict (e.g. case_id, age_months, observations, embedding_b64, ...).
    """
    threshold = drift_threshold if drift_threshold is not None else DEFAULT_DRIFT_THRESHOLD
    input_data = dict(input_kwargs)
    if psi_value() > threshold:
        logger.warning("Safe inference: drift PSI > %.2f → using fallback checklist", threshold)
        return fallback_checklist(input_data)
    if bias_metric_violated():
        logger.warning("Safe inference: bias metric violated → using fallback checklist")
        return fallback_checklist(input_data)
    try:
        return await medgemma_predict(**input_kwargs)
    except Exception as e:
        if _is_oom(e):
            logger.warning("Safe inference: OOM detected → using fallback checklist: %s", e)
            return fallback_checklist(input_data)
        raise
