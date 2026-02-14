"""
Feedback service — API and CLI for capturing feedback.
"""
import os
import sys
from typing import Any, Dict, List, Optional

# Try backend first
_backend = os.path.join(os.path.dirname(__file__), "..", "..", "backend")
if os.path.isdir(_backend) and _backend not in sys.path:
    sys.path.insert(0, _backend)

from .db import insert_feedback, get_feedback_by_inference, get_feedback_by_case
from .models import feedback_record


class FeedbackService:
    """Service for clinician feedback capture and retrieval."""

    def create(
        self,
        inference_id: str,
        case_id: str,
        clinician_id: str,
        feedback_type: str,
        corrected_risk: Optional[str] = None,
        corrected_summary: Optional[str] = None,
        rating: Optional[int] = None,
        comment: Optional[str] = None,
        **kwargs,
    ) -> str:
        """Create feedback record. Returns feedback_id."""
        data = feedback_record(
            inference_id=inference_id,
            case_id=case_id,
            clinician_id=clinician_id,
            feedback_type=feedback_type,
            corrected_risk=corrected_risk,
            corrected_summary=corrected_summary,
            rating=rating,
            comment=comment,
            metadata=kwargs.get("metadata"),
        )
        return insert_feedback(data)

    def get_by_inference(self, inference_id: str) -> List[Dict[str, Any]]:
        """Get feedback for an inference."""
        return get_feedback_by_inference(inference_id)

    def get_by_case(self, case_id: str) -> List[Dict[str, Any]]:
        """Get feedback for a case."""
        return get_feedback_by_case(case_id)
