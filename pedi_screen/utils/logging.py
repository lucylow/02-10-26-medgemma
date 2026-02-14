"""
Structured JSON logging for downstream processing.
"""
import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def log_structured(
    level: str,
    message: str,
    **metadata,
) -> None:
    """Emit JSON-structured log line."""
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "message": message,
        **metadata,
    }
    sys.stderr.write(json.dumps(record) + "\n")


def log_info(message: str, **metadata) -> None:
    log_structured("INFO", message, **metadata)


def log_warning(message: str, **metadata) -> None:
    log_structured("WARNING", message, **metadata)


def log_error(message: str, **metadata) -> None:
    log_structured("ERROR", message, **metadata)
