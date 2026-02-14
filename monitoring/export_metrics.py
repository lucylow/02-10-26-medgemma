"""Export metrics to Prometheus pushgateway or logs (dummy mode)."""
import os

DUMMY = os.getenv("METRICS_DUMMY", "1") == "1"


def record_inference(latency_sec: float, confidence: float, status: str = "ok"):
    if DUMMY:
        print(f"[metrics] inference latency={latency_sec:.3f}s confidence={confidence} status={status}")
    # else: push to Prometheus pushgateway


def record_embedding_norm(norm: float):
    if DUMMY:
        print(f"[metrics] embedding_norm={norm:.4f}")
