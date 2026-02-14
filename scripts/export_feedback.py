#!/usr/bin/env python3
"""
Export clinician feedback for model retraining (Page 11).
Produces JSONL with input_features, ai_risk, corrected_risk, etc.
Usage: python scripts/export_feedback.py --output feedback_dataset.jsonl
"""
import argparse
import json
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.db_cloudsql import is_cloudsql_enabled


def export_postgres(output_path: str) -> int:
    """Export from PostgreSQL (Cloud SQL / Supabase)."""
    from sqlalchemy import text
    from app.services.cloudsql_connector import get_engine

    engine = get_engine()
    sql = text("""
        SELECT f.feedback_id, f.case_id, f.inference_id, f.clinician_id,
               f.provided_at, f.feedback_type, f.corrected_risk, f.corrected_summary,
               f.rating, f.comment, f.clinician_notes, f.metadata,
               i.result_summary, i.result_risk, i.input_hash
        FROM clinician_feedback f
        LEFT JOIN inferences i ON f.inference_id = i.inference_id
        ORDER BY f.provided_at ASC
    """)
    with engine.connect() as conn:
        res = conn.execute(sql)
        rows = [dict(r._mapping) for r in res]

    count = 0
    with open(output_path, "w", encoding="utf-8") as f:
        for r in rows:
            entry = {
                "input_features": {
                    "inference_id": str(r.get("inference_id", "")),
                    "input_hash": r.get("input_hash"),
                },
                "ai_risk": r.get("result_risk"),
                "corrected_risk": r.get("corrected_risk"),
                "summary_in": r.get("result_summary"),
                "summary_out": r.get("corrected_summary"),
                "comment": r.get("comment"),
                "rating": r.get("rating"),
                "timestamp": r.get("provided_at").isoformat() if r.get("provided_at") else None,
                "feedback_type": r.get("feedback_type"),
            }
            f.write(json.dumps(entry, default=str) + "\n")
            count += 1
    return count


def export_memory(output_path: str) -> int:
    """Export from in-memory store (dev)."""
    from app.services.feedback_store import _feedback_store, _inference_store

    count = 0
    with open(output_path, "w", encoding="utf-8") as f:
        for fb in _feedback_store:
            inf = _inference_store.get(fb.get("inference_id", ""), {})
            entry = {
                "input_features": {
                    "inference_id": fb.get("inference_id"),
                    "input_hash": inf.get("input_hash"),
                },
                "ai_risk": inf.get("result_risk"),
                "corrected_risk": fb.get("corrected_risk"),
                "summary_in": inf.get("result_summary"),
                "summary_out": fb.get("corrected_summary"),
                "comment": fb.get("comment"),
                "rating": fb.get("rating"),
                "timestamp": fb.get("provided_at"),
                "feedback_type": fb.get("feedback_type"),
            }
            f.write(json.dumps(entry, default=str) + "\n")
            count += 1
    return count


def main():
    parser = argparse.ArgumentParser(description="Export feedback for model retraining")
    parser.add_argument("--output", "-o", default="feedback_dataset.jsonl", help="Output JSONL path")
    args = parser.parse_args()

    try:
        if is_cloudsql_enabled():
            count = export_postgres(args.output)
        else:
            count = export_memory(args.output)
        print(f"Exported {count} feedback entries to {args.output}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
