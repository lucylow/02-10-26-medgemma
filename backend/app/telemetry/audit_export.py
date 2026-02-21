"""
Phase 5: Regulatory audit export — cryptographic hashing and IRB-ready report generation.
"""
import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("app.telemetry.audit_export")


def hash_payload(payload: Any) -> str:
    """SHA-256 hash of JSON-serialized payload (sort_keys for determinism)."""
    if isinstance(payload, (dict, list)):
        serialized = json.dumps(payload, sort_keys=True, default=str)
    else:
        serialized = json.dumps({"value": payload}, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def generate_irb_export(
    output_path: Optional[str] = None,
    include_drift: bool = True,
    include_fairness: bool = True,
    include_audit_tail: bool = True,
) -> str:
    """
    Generate IRB-ready JSON report: drift summary, optional fairness summary, audit tail.
    Returns path to written file.
    """
    output_path = output_path or "irb_report.json"
    report = {
        "report_type": "irb_observability_export",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "drift_summary": [],
        "fairness_summary": [],
        "audit_tail": [],
    }
    try:
        from app.services.db_cloudsql import is_cloudsql_enabled
        if not is_cloudsql_enabled():
            _write_report(report, output_path)
            return output_path
    except Exception:
        _write_report(report, output_path)
        return output_path

    from app.services.cloudsql_connector import get_engine
    from sqlalchemy import text
    engine = get_engine()

    if include_drift:
        try:
            rows = engine.connect().execute(text("""
                SELECT model_name, feature_name, psi_value, drift_level, created_at
                FROM drift_metrics
                ORDER BY created_at DESC
                LIMIT 500
            """)).fetchall()
            report["drift_summary"] = [
                {
                    "model_name": r[0],
                    "feature_name": r[1],
                    "psi_value": float(r[2]) if r[2] is not None else None,
                    "drift_level": r[3],
                    "created_at": r[4].isoformat() if r[4] and hasattr(r[4], "isoformat") else str(r[4]),
                }
                for r in rows
            ]
        except Exception as e:
            logger.warning("IRB export: drift_metrics query failed: %s", e)

    if include_fairness:
        try:
            rows = engine.connect().execute(text("""
                SELECT model_name, protected_attribute, group_value,
                       false_positive_rate, false_negative_rate, created_at
                FROM fairness_metrics
                ORDER BY created_at DESC
                LIMIT 300
            """)).fetchall()
            report["fairness_summary"] = [
                {
                    "model_name": r[0],
                    "protected_attribute": r[1],
                    "group_value": r[2],
                    "false_positive_rate": float(r[3]) if r[3] is not None else None,
                    "false_negative_rate": float(r[4]) if r[4] is not None else None,
                    "created_at": r[5].isoformat() if r[5] and hasattr(r[5], "isoformat") else str(r[5]),
                }
                for r in rows
            ]
        except Exception as e:
            logger.warning("IRB export: fairness_metrics query failed: %s", e)

    if include_audit_tail:
        try:
            rows = engine.connect().execute(text("""
                SELECT event_type, user_id, model_name, input_hash, output_hash, created_at
                FROM audit_log
                ORDER BY created_at DESC
                LIMIT 200
            """)).fetchall()
            report["audit_tail"] = [
                {
                    "event_type": r[0],
                    "user_id": r[1],
                    "model_name": r[2],
                    "input_hash": r[3],
                    "output_hash": r[4],
                    "created_at": r[5].isoformat() if r[5] and hasattr(r[5], "isoformat") else str(r[5]),
                }
                for r in rows
            ]
        except Exception as e:
            logger.warning("IRB export: audit_log query failed: %s", e)

    report["report_hash"] = hash_payload(report)
    _write_report(report, output_path)
    return output_path


def _write_report(report: Dict[str, Any], path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)
