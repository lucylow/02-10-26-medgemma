"""
Compact audit log for every inference — append-only JSONL.
Never store raw images; only request_id, case_id, model_id, adapter_id, success, fallback_used.
"""
import json
import time
from pathlib import Path
from typing import Optional


def _audit_path() -> Path:
    try:
        from configs.defaults import settings
        path = Path(settings.AUDIT_LOG_PATH)
    except Exception:
        path = Path("data/audit.log")
    return path


def log_audit(
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
    Append one audit event for an inference.
    Fields: ts, request_id, case_id, model_id, adapter_id, emb_version, success, fallback_used, error.
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
    path = _audit_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")
    except Exception as e:
        # Do not fail the request; best-effort audit
        import logging
        logging.getLogger("audit").warning("Audit write failed: %s", e)
