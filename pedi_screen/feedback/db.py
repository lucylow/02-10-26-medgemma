"""
Feedback db — storage for clinician feedback.
Uses backend feedback_store when available; else in-memory.
"""
from typing import Any, Dict, List, Optional


_store: List[Dict[str, Any]] = []


def insert_feedback(data: Dict[str, Any]) -> str:
    """Insert feedback. Returns feedback_id."""
    import uuid
    fid = str(uuid.uuid4())
    data["feedback_id"] = fid
    _store.append(data)
    return fid


def get_feedback_by_inference(inference_id: str) -> List[Dict[str, Any]]:
    """Fetch feedback for an inference."""
    return [f for f in _store if f.get("inference_id") == inference_id]


def get_feedback_by_case(case_id: str) -> List[Dict[str, Any]]:
    """Fetch feedback for a case."""
    return [f for f in _store if f.get("case_id") == case_id]
