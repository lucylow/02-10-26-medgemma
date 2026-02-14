"""
Structured JSON logging for downstream processing (Page 14).
Use when JSON_STRUCTURED_LOGS=true for metadata-rich logs.
"""
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def _serialize(obj: Any) -> Any:
    """Serialize for JSON (handle non-JSON types)."""
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    if isinstance(obj, (dict, list, str, int, float, bool, type(None))):
        return obj
    return str(obj)


def log_structured(
    level: str,
    message: str,
    **metadata: Any,
) -> None:
    """Emit JSON-structured log line for downstream processing."""
    record: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "message": message,
    }
    for k, v in metadata.items():
        record[k] = _serialize(v)
    sys.stderr.write(json.dumps(record) + "\n")


def use_structured_logs() -> bool:
    """Check if structured JSON logs are enabled."""
    return os.environ.get("JSON_STRUCTURED_LOGS", "").lower() in ("1", "true", "yes")
