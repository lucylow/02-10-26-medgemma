"""
Confidence calibration: temperature scaling, bounding, low-confidence trigger.
Per PAGE 9.
"""
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

CONFIDENCE_FLOOR = 0.5
CONFIDENCE_CEILING = 0.95
LOW_CONFIDENCE_THRESHOLD = 0.6


def bound_confidence(confidence: float) -> float:
    """Bound confidence to [0.5, 0.95]."""
    try:
        c = float(confidence)
        return max(CONFIDENCE_FLOOR, min(CONFIDENCE_CEILING, c))
    except (TypeError, ValueError):
        return 0.5


def requires_clinician_review(confidence: float) -> bool:
    """True if confidence < 0.6 -> require clinician review."""
    return bound_confidence(confidence) < LOW_CONFIDENCE_THRESHOLD


def apply_calibration(output: Dict[str, Any]) -> Dict[str, Any]:
    """Apply confidence bounding and set requires_clinician_review."""
    out = dict(output)
    c = out.get("confidence", 0.5)
    out["confidence"] = bound_confidence(c)
    if requires_clinician_review(out["confidence"]):
        out["requires_clinician_review"] = True
        out["review_reason"] = "Model confidence below threshold"
    return out
