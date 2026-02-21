"""
Post-processor: validation + safety guardrails on model output.
Enforces schema, confidence bounds, and fallback when invalid.
"""
import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

CONFIDENCE_FLOOR = 0.5
CONFIDENCE_CEILING = 0.95
LOW_CONFIDENCE_THRESHOLD = 0.6


def validate_and_sanitize(output: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enforce schema and bounds. If invalid, return structured fallback.
    """
    out = dict(output)
    # Bound confidence
    try:
        c = float(out.get("confidence", 0.5))
        c = max(CONFIDENCE_FLOOR, min(CONFIDENCE_CEILING, c))
        out["confidence"] = c
    except (TypeError, ValueError):
        out["confidence"] = 0.5
    # Ensure risk is allowed
    risk = str(out.get("risk", "monitor")).lower()
    if risk not in ("low", "monitor", "high", "refer", "manual_review_required"):
        out["risk"] = "monitor"
    else:
        out["risk"] = risk
    # Require list fields
    for key in ("summary", "recommendations", "reasoning_chain", "evidence"):
        if key not in out or not isinstance(out[key], list):
            out[key] = out.get(key) if isinstance(out.get(key), list) else []
    # Low confidence -> flag for clinician review
    if out["confidence"] < LOW_CONFIDENCE_THRESHOLD and out.get("risk") != "manual_review_required":
        out["requires_clinician_review"] = True
        out["review_reason"] = "Model confidence below threshold"
    return out


def should_fallback(output: Dict[str, Any]) -> bool:
    """Return True if output should be replaced by structured fallback."""
    if output.get("fallback") is True:
        return True
    if output.get("risk") == "manual_review_required":
        return False  # already safe
    try:
        if float(output.get("confidence", 0)) < 0.4:
            return True
    except (TypeError, ValueError):
        return True
    return False


def fallback_response(reason: str = "Model uncertainty") -> Dict[str, Any]:
    """Structured fallback when model times out, invalid JSON, or tool fails. Log as MODEL_FALLBACK."""
    return {
        "summary": ["Manual review required."],
        "risk": "manual_review_required",
        "reason": reason,
        "fallback": True,
        "fallback_reason": "MODEL_FALLBACK",
        "confidence": 0.5,
        "uncertainty": 0.5,
        "recommendations": ["Complete clinical assessment.", "Review screening history."],
        "recommended_actions": ["Complete clinical assessment.", "Review screening history."],
        "reasoning_chain": [reason],
        "rationale": [reason],
        "evidence": [],
        "requires_clinician_review": True,
        "manual_review_required": True,
    }
