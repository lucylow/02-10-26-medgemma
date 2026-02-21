# backend/app/services/audit.py
"""
Audit logging: generic write_audit and compact inference log for every inference.
Inference events go to data/audit.log (JSONL) with request_id, success, fallback_used; no raw images.
"""
import json
import os
import time
from datetime import datetime, timezone
from typing import Optional

AUDIT_PATH = "infra_audit.log"
INFERENCE_AUDIT_PATH = os.getenv("AUDIT_LOG_PATH", "data/audit.log")


def _now_iso():
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()


def write_audit(action: str, actor: str, target: str, payload: dict):
    entry = {
        "ts": _now_iso(),
        "action": action,
        "actor": actor,
        "target": target,
        "payload": payload
    }
    try:
        with open(AUDIT_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        print("Failed to write audit:", e)


def log_inference_audit(
    request_id: str,
    case_id: str,
    model_id: str,
    adapter_id: str,
    emb_version: str,
    success: bool,
    fallback_used: bool,
    error_msg: Optional[str] = None,
) -> None:
    """
    Append one compact inference audit event (JSONL).
    Same contract as docs/error_handling.md; never store raw images.
    """
    event = {
        "ts": time.time(),
        "request_id": request_id,
        "case_id": case_id,
        "model_id": model_id,
        "adapter_id": adapter_id,
        "emb_version": emb_version,
        "success": success,
        "fallback_used": fallback_used,
        "error": error_msg,
    }
    path = os.getenv("AUDIT_LOG_PATH", INFERENCE_AUDIT_PATH)
    try:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")
    except Exception as e:
        import logging
        logging.getLogger("audit").warning("Inference audit write failed: %s", e)
