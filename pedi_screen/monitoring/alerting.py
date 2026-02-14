"""
Alerting — threshold-based alerts for confidence, drift, override rate.
"""
import json
import os
from typing import Any, Dict, List, Optional

from .aggregator import get_aggregated_metrics
from .metrics import get_events


def load_alert_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load alerts.json config."""
    if config_path and os.path.isfile(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    base = os.path.dirname(__file__)
    for _ in range(4):
        p = os.path.join(base, "..", "..", "configs", "alerts.json")
        if os.path.isfile(p):
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        base = os.path.dirname(base)
    return {
        "confidence_min": 0.5,
        "override_rate_max": 0.3,
        "inference_time_max_ms": 30000,
    }


def check_alerts(config_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Check thresholds and return list of triggered alerts.
    """
    config = load_alert_config(config_path)
    alerts: List[Dict[str, Any]] = []

    metrics = get_aggregated_metrics(event_type="inference")
    feedback_events = get_events(event_type="feedback")
    inference_events = get_events(event_type="inference")

    # Confidence below threshold
    conf_min = config.get("confidence_min", 0.5)
    if metrics.get("confidence_mean", 1) < conf_min and metrics.get("count", 0) > 0:
        alerts.append({
            "type": "confidence_low",
            "message": f"Mean confidence {metrics['confidence_mean']:.2f} below threshold {conf_min}",
            "severity": "warning",
        })

    # Override rate too high
    override_max = config.get("override_rate_max", 0.3)
    n_inf = len(inference_events)
    n_fb = len(feedback_events)
    if n_inf > 0:
        override_rate = n_fb / n_inf
        if override_rate > override_max:
            alerts.append({
                "type": "override_rate_high",
                "message": f"Clinician override rate {override_rate:.2f} exceeds {override_max}",
                "severity": "warning",
            })

    # Inference time too high
    time_max = config.get("inference_time_max_ms", 30000)
    if metrics.get("avg_inference_time_ms", 0) > time_max:
        alerts.append({
            "type": "inference_slow",
            "message": f"Avg inference time {metrics['avg_inference_time_ms']}ms exceeds {time_max}ms",
            "severity": "info",
        })

    return alerts
