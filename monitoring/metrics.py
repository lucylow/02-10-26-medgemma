"""
Observability: inference counters, latency, and basic drift detection.
Export counters: inference_success, inference_failure, fallback_count, avg_latency_ms.
Drift: rolling mean of embedding norms vs baseline; alert when distribution shifts.
"""
import logging
from collections import deque
from typing import Deque, List, Optional

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore

logger = logging.getLogger("monitoring.metrics")

# Counters (in-memory; for production use Prometheus or similar)
inference_success = 0
inference_failure = 0
fallback_count = 0
_latency_ms: Deque[float] = deque(maxlen=10000)


def record_inference_result(success: bool, fallback_used: bool, latency_ms: float) -> None:
    """Record one inference for counters and latency."""
    global inference_success, inference_failure, fallback_count
    if success:
        inference_success += 1
    else:
        inference_failure += 1
    if fallback_used:
        fallback_count += 1
    _latency_ms.append(latency_ms)


def get_avg_latency_ms() -> float:
    if not _latency_ms or np is None:
        return 0.0
    return float(np.mean(_latency_ms))


# Drift detection: rolling window of embedding norms
_emb_queue: Deque[float] = deque(maxlen=1000)
_baseline_mean: Optional[float] = None


def set_baseline_mean(mean: float) -> None:
    """Set baseline mean embedding norm for drift comparison."""
    global _baseline_mean
    _baseline_mean = mean


def record_embedding(emb: "np.ndarray") -> None:
    """Record embedding norm for drift monitor."""
    if np is None:
        return
    norm = float(np.linalg.norm(emb))
    _emb_queue.append(norm)
    if np is not None and len(_emb_queue) == _emb_queue.maxlen and _baseline_mean is not None:
        current_mean = np.mean(_emb_queue)
        # Simple threshold: alert if mean shifts by more than 20%
        if abs(current_mean - _baseline_mean) / (_baseline_mean + 1e-12) > 0.2:
            logger.warning(
                "Drift alert: embedding norm mean %.4f vs baseline %.4f",
                current_mean,
                _baseline_mean,
            )


def get_drift_status() -> dict:
    """Return current drift status for dashboards."""
    if not _emb_queue or _baseline_mean is None or np is None:
        return {"baseline_set": _baseline_mean is not None, "current_mean": None}
    return {
        "baseline_set": True,
        "current_mean": float(np.mean(_emb_queue)),
        "baseline_mean": _baseline_mean,
    }


def get_effective_drift_psi(threshold: float = 0.25) -> float:
    """
    Effective drift score for guardrails (PSI-like).
    Uses relative shift of embedding norm mean vs baseline; compatible with
    telemetry PSI when both are configured. Return value > threshold
    indicates significant drift (e.g. > 0.25 → trigger fallback).
    """
    status = get_drift_status()
    current = status.get("current_mean")
    baseline = status.get("baseline_mean")
    if current is None or baseline is None or baseline == 0:
        return 0.0
    relative_shift = abs(float(current) - float(baseline)) / (float(baseline) + 1e-12)
    return relative_shift
