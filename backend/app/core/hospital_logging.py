"""
Hospital-grade structured logging for Epic/FHIR and production deployments.
- Correlation ID for request tracing (no PHI in logs).
- Action, duration_ms, status, error_code for audit and SIEM.
"""
import json
import time
import uuid
from contextvars import ContextVar
from typing import Any, Optional

from app.core.logger import logger

# Request-scoped correlation ID (set by middleware or first Epic route in chain)
correlation_id_ctx: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> str:
    """Return current correlation ID or generate one."""
    cid = correlation_id_ctx.get()
    if cid:
        return cid
    cid = str(uuid.uuid4())
    correlation_id_ctx.set(cid)
    return cid


def set_correlation_id(cid: str) -> None:
    """Set correlation ID for current context (e.g. from X-Request-ID header)."""
    correlation_id_ctx.set(cid)


def log_epic_action(
    action: str,
    status: str = "ok",
    duration_ms: Optional[float] = None,
    error_code: Optional[str] = None,
    **metadata: Any,
) -> None:
    """
    Emit a structured log line for Epic/FHIR actions.
    Do not include PHI or raw tokens in metadata.
    """
    payload = {
        "correlation_id": get_correlation_id(),
        "action": action,
        "status": status,
        "timestamp": time.time(),
    }
    if duration_ms is not None:
        payload["duration_ms"] = round(duration_ms, 2)
    if error_code:
        payload["error_code"] = error_code
    payload.update({k: v for k, v in metadata.items() if v is not None})
    logger.info(json.dumps(payload))


class EpicRequestTimer:
    """Context manager to log action duration and status."""

    def __init__(self, action: str, **extra: Any):
        self.action = action
        self.extra = extra
        self.start: Optional[float] = None

    def __enter__(self) -> "EpicRequestTimer":
        self.start = time.perf_counter()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        duration_ms = (time.perf_counter() - self.start) * 1000 if self.start else None
        status = "error" if exc_type else "ok"
        error_code = getattr(exc_val, "code", str(exc_type.__name__)) if exc_val else None
        log_epic_action(
            self.action,
            status=status,
            duration_ms=duration_ms,
            error_code=error_code,
            **self.extra,
        )
