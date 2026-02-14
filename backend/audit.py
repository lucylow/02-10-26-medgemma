"""
Append-only audit logger for inference calls.
Stores minimal metadata in data/audit_log.jsonl.
"""
import hashlib
import json
import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

AUDIT_DIR = Path(os.getenv("AUDIT_LOG_DIR", "data"))
AUDIT_FILE = AUDIT_DIR / "audit_log.jsonl"
AUDIT_PATH = os.getenv("AUDIT_LOG_PATH", str(AUDIT_DIR / "audit_log.jsonl"))
_lock = threading.Lock()


def _ensure_audit_dir():
    Path(AUDIT_PATH).parent.mkdir(parents=True, exist_ok=True)


def append_audit(entry: dict[str, Any]) -> None:
    """Append a generic audit entry (JSONL)."""
    _ensure_audit_dir()
    with _lock:
        with open(AUDIT_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, default=str) + "\n")


def log_inference(
    case_id: str,
    adapter_id: str,
    model_id: str,
    input_hash: str,
    confidence: float,
    status: str = "ok",
    user_pseudonym: Optional[str] = None,
    emb_version: Optional[str] = None,
):
    """Append one audit entry to JSONL file."""
    _ensure_audit_dir()
    entry = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "case_id": case_id,
        "adapter_id": adapter_id,
        "model_id": model_id,
        "input_hash": input_hash,
        "confidence": confidence,
        "action": "inference",
        "status": status,
    }
    if user_pseudonym:
        entry["user_pseudonym"] = user_pseudonym
    if emb_version:
        entry["emb_version"] = emb_version

    append_audit(entry)


def input_hash_from_embedding(embedding_b64: str, observations: str = "") -> str:
    """Compute SHA256 hash for audit."""
    data = embedding_b64 + "|" + observations
    return "sha256:" + hashlib.sha256(data.encode()).hexdigest()
