"""
Structured JSON logging for API and inference.
Use setup_logging(level) at app startup; logs include module and support request_id via context.
"""
import logging
import sys
from typing import Any, Dict, Optional

try:
    from pythonjsonlogger import jsonlogger
    _HAS_JSON_LOGGER = True
except ImportError:
    _HAS_JSON_LOGGER = False


def setup_logging(level: str = "INFO") -> None:
    """Configure root logger with JSON formatter to stdout."""
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.handlers = []
    handler = logging.StreamHandler(sys.stdout)
    if _HAS_JSON_LOGGER:
        formatter = jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s"
        )
        handler.setFormatter(formatter)
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
        )
    root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a logger for the given module name."""
    return logging.getLogger(name)


def log_with_request(
    logger: logging.Logger,
    level: int,
    msg: str,
    request_id: Optional[str] = None,
    **extra: Any,
) -> None:
    """Log message with optional request_id and extra structured fields."""
    if request_id is not None:
        extra["request_id"] = request_id
    if extra:
        logger.log(level, msg, extra=extra)
    else:
        logger.log(level, msg)
