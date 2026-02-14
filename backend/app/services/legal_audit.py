"""
Legal audit service — persists audit entries to MongoDB report_audit or file fallback.
Used by LegalMiddleware, policy engine, and consent/retention flows.
"""
import json
import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger("legal.audit")

AUDIT_FALLBACK_PATH = "legal_audit.log"


def _now_iso():
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()


async def write_audit_entry(event_type: str, payload: dict) -> None:
    """
    Persist an audit entry. Uses MongoDB report_audit when available;
    falls back to local file for demo/CI. Errors logged but not raised.
    """
    entry = {
        "report_id": payload.get("report_id"),
        "action": event_type,
        "actor": payload.get("actor"),
        "payload": payload,
        "created_at": time.time(),
    }
    try:
        from app.services.db import get_db

        db = get_db()
        await db.report_audit.insert_one(entry)
    except Exception as e:
        logger.warning("Audit DB write failed (%s); writing to local file", e)
        _fallback_write(event_type, payload)


def _fallback_write(event_type: str, payload: dict) -> None:
    """Write to local file when MongoDB is unavailable."""
    try:
        with open(AUDIT_FALLBACK_PATH, "a", encoding="utf-8") as f:
            f.write(
                json.dumps(
                    {"ts": _now_iso(), "type": event_type, "payload": payload},
                    default=str,
                )
                + "\n"
            )
    except Exception as e:
        logger.exception("Fallback audit write failed: %s", e)
