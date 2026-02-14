"""
Audit logger - writes structured audit entries with HMAC chaining.
In-memory store for demo; production would use append-only DB + object storage.
"""

import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from loguru import logger

from .schema import AuditLogEntry, AuditRequestMeta, AuditResponseMeta
from .hmac_chain import compute_hmac

# HMAC key from env; in prod use KMS
_AUDIT_HMAC_KEY = os.getenv("AUDIT_HMAC_KEY", "dev-audit-hmac-key-change-in-prod").encode("utf-8")

# In-memory append-only store (replace with DB in production)
_audit_store: List[Dict[str, Any]] = []
_prev_hmac: Optional[str] = None


def _get_prev_hmac() -> Optional[str]:
    """Get last HMAC from store for chaining."""
    global _prev_hmac
    if _audit_store:
        return _audit_store[-1].get("hmac")
    return None


def _append_entry(entry: Dict[str, Any]) -> None:
    """Append entry with computed HMAC."""
    global _prev_hmac
    prev = _get_prev_hmac()
    entry["prev_hmac"] = prev
    hmac_val = compute_hmac(prev, entry, _AUDIT_HMAC_KEY)
    entry["hmac"] = hmac_val
    _audit_store.append(entry)
    _prev_hmac = hmac_val


def audit_logger(
    event_type: str,
    actor_id: str,
    actor_role: str,
    resource_id: Optional[str] = None,
    request_meta: Optional[AuditRequestMeta] = None,
    response_meta: Optional[AuditResponseMeta] = None,
    outcome: Optional[str] = None,
    client_ip: Optional[str] = None,
    request_id: Optional[str] = None,
    resource_type: str = "case",
) -> str:
    """
    Write an audit log entry with HMAC chaining.
    Returns event_id.
    """
    event_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    entry = {
        "event_id": event_id,
        "event_type": event_type,
        "actor_id": actor_id,
        "actor_role": actor_role,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "timestamp": timestamp,
        "request": request_meta.model_dump() if request_meta else None,
        "response": response_meta.model_dump() if response_meta else None,
        "outcome": outcome,
        "client_ip": client_ip,
        "request_id": request_id,
    }

    _append_entry(entry)
    logger.debug("Audit: {} {} {}", event_type, actor_id, event_id)
    return event_id


def get_audit_store() -> List[Dict[str, Any]]:
    """Return current audit store (for verification/export)."""
    return list(_audit_store)


def get_hmac_key() -> bytes:
    """Return HMAC key for verification (tests only; prod uses separate verifier)."""
    return _AUDIT_HMAC_KEY
