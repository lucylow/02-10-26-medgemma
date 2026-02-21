"""Monitoring: audit log for inferences (no raw images), metrics and drift."""
from .audit import log_audit

__all__ = ["log_audit"]

try:
    from .metrics import (
        record_inference_result,
        get_avg_latency_ms,
        record_embedding,
        set_baseline_mean,
        get_drift_status,
        inference_success,
        inference_failure,
        fallback_count,
    )
    __all__ += [
        "record_inference_result",
        "get_avg_latency_ms",
        "record_embedding",
        "set_baseline_mean",
        "get_drift_status",
        "inference_success",
        "inference_failure",
        "fallback_count",
    ]
except ImportError:
    pass
