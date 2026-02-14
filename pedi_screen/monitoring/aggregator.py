"""
Aggregator — aggregate metrics for dashboards.
"""
from typing import Any, Dict, List

from .metrics import get_events


def get_aggregated_metrics(
    event_type: str = "inference",
    limit: int = 10000,
) -> Dict[str, Any]:
    """
    Aggregate inference metrics: avg duration, confidence distribution, risk counts.
    """
    events = get_events(event_type=event_type, limit=limit)
    if not events:
        return {
            "count": 0,
            "avg_inference_time_ms": 0,
            "confidence_mean": 0,
            "confidence_std": 0,
            "risk_distribution": {},
        }

    times = [e["inference_time_ms"] for e in events if "inference_time_ms" in e]
    confs = [e["confidence"] for e in events if "confidence" in e]
    risks: Dict[str, int] = {}
    for e in events:
        r = e.get("risk", "unknown")
        risks[r] = risks.get(r, 0) + 1

    n = len(events)
    avg_time = sum(times) / len(times) if times else 0
    mean_conf = sum(confs) / len(confs) if confs else 0
    var_conf = (
        sum((c - mean_conf) ** 2 for c in confs) / len(confs) if confs else 0
    )
    std_conf = var_conf ** 0.5

    return {
        "count": n,
        "avg_inference_time_ms": round(avg_time, 2),
        "confidence_mean": round(mean_conf, 4),
        "confidence_std": round(std_conf, 4),
        "risk_distribution": risks,
    }
