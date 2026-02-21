"""
Structured explainability: enforce list of typed items (milestone_gap, etc.).
Reject responses that do not match. Per PAGE 8.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ExplainabilityItem(BaseModel):
    """Single explainability entry (milestone_gap, signal, etc.)."""
    type: str = Field(..., description="e.g. milestone_gap, signal, guideline_ref")
    feature: Optional[str] = Field(None, description="e.g. two_word_phrases")
    age_expected: Optional[int] = Field(None, description="Age in months when expected")
    confidence_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    description: Optional[str] = None


def validate_explainability(data: List[Any]) -> List[Dict[str, Any]]:
    """Validate and coerce explainability list to schema. Returns valid list or empty."""
    out = []
    for item in data or []:
        if isinstance(item, dict):
            try:
                out.append(ExplainabilityItem(**item).dict())
            except Exception:
                pass
        elif isinstance(item, ExplainabilityItem):
            out.append(item.dict())
    return out


def ensure_explainability_in_output(output: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure output has explainability list; merge from tool if present."""
    out = dict(output)
    existing = out.get("explainability")
    if isinstance(existing, list):
        out["explainability"] = validate_explainability(existing)
    else:
        out["explainability"] = validate_explainability(out.get("explainability") or [])
    return out


def ensure_hai_structured_output(output: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensure HAI-ready shape: risk, confidence, rationale, evidence, uncertainty,
    manual_review_required, recommended_actions. Fills from existing fields when missing.
    """
    out = dict(output)
    out.setdefault("risk", "monitor")
    out.setdefault("confidence", 0.5)
    c = float(out.get("confidence", 0.5))
    out["uncertainty"] = out.get("uncertainty", round(1.0 - c, 2))
    out["rationale"] = out.get("rationale") or out.get("reasoning_chain") or []
    out["recommended_actions"] = out.get("recommended_actions") or out.get("recommendations") or []
    out["manual_review_required"] = out.get("manual_review_required", out.get("requires_clinician_review", c < 0.65))
    if "evidence" not in out or not isinstance(out["evidence"], list):
        out["evidence"] = out.get("evidence") if isinstance(out.get("evidence"), list) else []
    return out
