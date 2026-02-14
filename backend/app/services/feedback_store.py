# backend/app/services/feedback_store.py
"""
Feedback store for clinician feedback on AI inferences.
Uses Cloud SQL (PostgreSQL) when available, else in-memory store for local dev.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.logger import logger
from app.services.db_cloudsql import is_cloudsql_enabled

# In-memory store for dev when no Postgres is configured
_feedback_store: List[Dict[str, Any]] = []
_inference_store: Dict[str, Dict[str, Any]] = {}


def insert_inference(
    inference_id: str,
    case_id: str,
    screening_id: Optional[str],
    input_hash: Optional[str],
    result_summary: Optional[str],
    result_risk: Optional[str],
) -> None:
    """Insert an inference record for feedback linkage."""
    if is_cloudsql_enabled():
        from sqlalchemy import text
        from app.services.cloudsql_connector import get_engine
        engine = get_engine()
        sql = text("""
            INSERT INTO inferences (inference_id, case_id, screening_id, input_hash, result_summary, result_risk)
            VALUES (:inference_id::uuid, :case_id, :screening_id, :input_hash, :result_summary, :result_risk)
        """)
        try:
            with engine.begin() as conn:
                conn.execute(sql, {
                    "inference_id": inference_id,
                    "case_id": case_id,
                    "screening_id": screening_id,
                    "input_hash": input_hash,
                    "result_summary": result_summary,
                    "result_risk": result_risk,
                })
        except Exception as e:
            logger.warning("Failed to insert inference record: %s", e)
    else:
        _inference_store[inference_id] = {
            "inference_id": inference_id,
            "case_id": case_id,
            "screening_id": screening_id,
            "input_hash": input_hash,
            "result_summary": result_summary,
            "result_risk": result_risk,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }


def insert_feedback(data: dict) -> str:
    """Insert feedback. Returns feedback_id."""
    feedback_id = str(uuid.uuid4())
    if is_cloudsql_enabled():
        from sqlalchemy import text
        from app.services.cloudsql_connector import get_engine
        engine = get_engine()
        sql = text("""
            INSERT INTO clinician_feedback (
                feedback_id, case_id, inference_id, clinician_id, feedback_type,
                corrected_risk, corrected_summary, rating, comment, clinician_notes, metadata
            )
            VALUES (
                :feedback_id::uuid, :case_id, :inference_id::uuid, :clinician_id::uuid,
                :feedback_type, :corrected_risk, :corrected_summary, :rating,
                :comment, :clinician_notes, :metadata::jsonb
            )
        """)
        params = {
            "feedback_id": feedback_id,
            "case_id": str(data["case_id"]),
            "inference_id": str(data["inference_id"]),
            "clinician_id": str(data["clinician_id"]),
            "feedback_type": data["feedback_type"],
            "corrected_risk": data.get("corrected_risk"),
            "corrected_summary": data.get("corrected_summary"),
            "rating": data.get("rating"),
            "comment": data.get("comment"),
            "clinician_notes": data.get("clinician_notes"),
            "metadata": json.dumps(data.get("metadata", {})),
        }
        with engine.begin() as conn:
            conn.execute(sql, params)
    else:
        doc = {
            "feedback_id": feedback_id,
            "case_id": data["case_id"],
            "inference_id": data["inference_id"],
            "clinician_id": data["clinician_id"],
            "provided_at": datetime.now(timezone.utc).isoformat(),
            "feedback_type": data["feedback_type"],
            "corrected_risk": data.get("corrected_risk"),
            "corrected_summary": data.get("corrected_summary"),
            "rating": data.get("rating"),
            "comment": data.get("comment"),
            "clinician_notes": data.get("clinician_notes"),
            "metadata": data.get("metadata", {}),
        }
        _feedback_store.append(doc)
    return feedback_id


def get_feedback_by_inference(inference_id: str) -> List[Dict[str, Any]]:
    """Fetch feedback for an inference."""
    if is_cloudsql_enabled():
        from sqlalchemy import text
        from app.services.cloudsql_connector import get_engine
        engine = get_engine()
        sql = text("""
            SELECT feedback_id, case_id, inference_id, clinician_id, provided_at,
                   feedback_type, corrected_risk, corrected_summary, rating, comment,
                   clinician_notes, metadata
            FROM clinician_feedback
            WHERE inference_id = :inference_id::uuid
            ORDER BY provided_at DESC
        """)
        with engine.connect() as conn:
            res = conn.execute(sql, {"inference_id": inference_id})
            rows = [dict(r._mapping) for r in res]
        for r in rows:
            if r.get("provided_at"):
                r["provided_at"] = r["provided_at"].isoformat()
            if r.get("metadata") and hasattr(r["metadata"], "copy"):
                r["metadata"] = dict(r["metadata"])
        return rows
    return [f for f in _feedback_store if f.get("inference_id") == inference_id]


def get_feedback_by_case(case_id: str) -> List[Dict[str, Any]]:
    """Fetch feedback for a case."""
    if is_cloudsql_enabled():
        from sqlalchemy import text
        from app.services.cloudsql_connector import get_engine
        engine = get_engine()
        sql = text("""
            SELECT feedback_id, case_id, inference_id, clinician_id, provided_at,
                   feedback_type, corrected_risk, corrected_summary, rating, comment,
                   clinician_notes, metadata
            FROM clinician_feedback
            WHERE case_id = :case_id
            ORDER BY provided_at DESC
        """)
        with engine.connect() as conn:
            res = conn.execute(sql, {"case_id": case_id})
            rows = [dict(r._mapping) for r in res]
        for r in rows:
            if r.get("provided_at"):
                r["provided_at"] = r["provided_at"].isoformat()
            if r.get("metadata") and hasattr(r["metadata"], "copy"):
                r["metadata"] = dict(r["metadata"])
        return rows
    return [f for f in _feedback_store if f.get("case_id") == case_id]


def inference_exists(inference_id: str) -> bool:
    """Check if inference exists."""
    if is_cloudsql_enabled():
        from sqlalchemy import text
        from app.services.cloudsql_connector import get_engine
        engine = get_engine()
        sql = text("SELECT 1 FROM inferences WHERE inference_id = :inference_id::uuid LIMIT 1")
        with engine.connect() as conn:
            res = conn.execute(sql, {"inference_id": inference_id})
            return res.first() is not None
    return inference_id in _inference_store
