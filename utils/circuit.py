"""
Circuit breaker for external calls (adapter download, HF fetch, Vertex).
When tripped, fall back to cached or mock instead of calling the failing service.
"""
import logging
from typing import Callable, TypeVar

logger = logging.getLogger("circuit_breaker")

try:
    from pybreaker import CircuitBreaker
    _HAS_PYBREAKER = True
except ImportError:
    _HAS_PYBREAKER = False

T = TypeVar("T")


def _get_circuit_config():
    try:
        from configs.defaults import settings
        return (
            getattr(settings, "CIRCUIT_BREAKER_ERRORS", 5),
            getattr(settings, "CIRCUIT_BREAKER_COOLDOWN_SEC", 30),
        )
    except Exception:
        return 5, 30


if _HAS_PYBREAKER:
    _fail_max, _reset_timeout = _get_circuit_config()
    adapter_cb = CircuitBreaker(fail_max=_fail_max, reset_timeout=_reset_timeout)

    def circuit_wrap(func: Callable[..., T], cb: CircuitBreaker = adapter_cb) -> Callable[..., T]:
        """Wrap a callable with the circuit breaker."""
        return cb(func)
else:
    adapter_cb = None

    def circuit_wrap(func: Callable[..., T], cb: object = None) -> Callable[..., T]:
        """No-op when pybreaker not installed."""
        return func


def download_adapter(adapter_path: str) -> bool:
    """
    Download adapter from path (local, gs://, or URL).
    Wrapped with circuit breaker; when open, raise so caller can fall back to cached/mock.
    """
    if not adapter_path:
        return True
    if adapter_path.startswith(("gs://", "https://", "http://")):
        # Optional: actual download logic; for now just validate and return True
        logger.info("Adapter path is remote: %s (download not implemented in stub)", adapter_path)
        return True
    import os
    if os.path.exists(adapter_path):
        return True
    raise FileNotFoundError(f"Adapter path not found: {adapter_path}")
