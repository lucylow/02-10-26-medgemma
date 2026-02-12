# backend/app/services/audit.py
import json
import time
from datetime import datetime, timezone

AUDIT_PATH = "infra_audit.log"


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
        with open(AUDIT_PATH, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        print("Failed to write audit:", e)
