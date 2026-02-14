"""
Feedback models — Pydantic models for feedback records.
"""
from datetime import datetime
from typing import Any, Dict, Optional

# Use typing for compatibility without pydantic dependency in CLI
# In production, use pydantic BaseModel


def feedback_record(
    inference_id: str,
    case_id: str,
    clinician_id: str,
    feedback_type: str,
    corrected_risk: Optional[str] = None,
    corrected_summary: Optional[str] = None,
    rating: Optional[int] = None,
    comment: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build feedback record dict."""
    return {
        "inference_id": inference_id,
        "case_id": case_id,
        "clinician_id": clinician_id,
        "feedback_type": feedback_type,
        "corrected_risk": corrected_risk,
        "corrected_summary": corrected_summary,
        "rating": rating,
        "comment": comment,
        "metadata": metadata or {},
        "provided_at": datetime.utcnow().isoformat() + "Z",
    }
