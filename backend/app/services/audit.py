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
    fallback_reason: Optional[str] = None,
) -> None:
    """
    Append one compact inference audit event (JSONL).
    Same contract as docs/error_handling.md; never store raw images.
    When fallback_used=True, pass fallback_reason e.g. MODEL_FALLBACK for compliance.
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
    if fallback_reason:
        event["fallback_reason"] = fallback_reason
    _append_audit_event(event)


def log_inference_audit_expanded(
    request_id: str,
    case_id: str,
    model_id: str,
    adapter_id: Optional[str] = None,
    prompt_version: Optional[str] = None,
    tool_chain: Optional[list] = None,
    confidence: Optional[float] = None,
    clinician_override: bool = False,
    success: bool = True,
    fallback_used: bool = False,
    error_msg: Optional[str] = None,
    decision_payload: Optional[dict] = None,
    drift_alert: bool = False,
) -> None:
    """
    Expanded audit entry for HAI/MCP pipeline (PAGE 13).
    Stores model_id, adapter_id, prompt_version, tool_chain, confidence, clinician_override.
    When using agents, pass decision_payload (timestamp, risk, agent_id, etc.) for compliance.
    Set drift_alert=True when drift monitor signals; logged for dashboard/alerting.
    """
    event = {
        "timestamp": _now_iso(),
        "ts": time.time(),
        "request_id": request_id,
        "case_id": case_id,
        "model_id": model_id or "",
        "adapter_id": adapter_id,
        "prompt_version": prompt_version,
        "tool_chain": tool_chain or [],
        "confidence": confidence,
        "clinician_override": clinician_override,
        "success": success,
        "fallback_used": fallback_used,
        "error": error_msg,
        "drift_alert": drift_alert,
    }
    if decision_payload is not None:
        event["decision"] = decision_payload
    _append_audit_event(event)


def _append_audit_event(event: dict) -> None:
    path = os.getenv("AUDIT_LOG_PATH", INFERENCE_AUDIT_PATH)
    try:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")
    except Exception as e:
        import logging
        logging.getLogger("audit").warning("Inference audit write failed: %s", e)
