"""
Metrics — track inference duration, confidence distributions, clinician overrides.
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

_METRICS_STORE: List[Dict[str, Any]] = []
_STORE_PATH: Optional[str] = None


def configure(store_path: Optional[str] = None) -> None:
    """Configure metrics store path (e.g. for local JSON file)."""
    global _STORE_PATH
    _STORE_PATH = store_path


def record_inference(
    case_id: str,
    inference_time_ms: int,
    confidence: float,
    risk: str,
    model_id: Optional[str] = None,
    **kwargs,
) -> None:
    """Record an inference event for telemetry."""
    event = {
        "event_type": "inference",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "case_id": case_id,
        "inference_time_ms": inference_time_ms,
        "confidence": confidence,
        "risk": risk,
        "model_id": model_id,
        **kwargs,
    }
    _METRICS_STORE.append(event)
    _persist(event)


def record_feedback(
    inference_id: str,
    feedback_type: str,
    corrected_risk: Optional[str] = None,
    **kwargs,
) -> None:
    """Record clinician feedback (override/correction) for telemetry."""
    event = {
        "event_type": "feedback",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "inference_id": inference_id,
        "feedback_type": feedback_type,
        "corrected_risk": corrected_risk,
        **kwargs,
    }
    _METRICS_STORE.append(event)
    _persist(event)


def _persist(event: Dict[str, Any]) -> None:
    """Persist event to file if configured."""
    if not _STORE_PATH:
        return
    Path(_STORE_PATH).parent.mkdir(parents=True, exist_ok=True)
    with open(_STORE_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")


def get_events(event_type: Optional[str] = None, limit: int = 1000) -> List[Dict[str, Any]]:
    """Retrieve events from store (in-memory)."""
    items = _METRICS_STORE
    if event_type:
        items = [e for e in items if e.get("event_type") == event_type]
    return items[-limit:]
