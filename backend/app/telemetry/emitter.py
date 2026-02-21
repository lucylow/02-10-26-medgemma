"""
Phase 1 telemetry: emit AI inference events to DB (ai_events) and Prometheus.
Best-effort: inference must not fail if telemetry write fails.
Labels for Prometheus are bounded: org_id, model_name, fallback_model, error_code.
"""
import json
import logging
import time
import uuid
from typing import Any, Dict, Optional

logger = logging.getLogger("app.telemetry")

# Prometheus metrics (lazy init to avoid import errors when prometheus_client not installed)
_INFER_REQUESTS = None
_INFER_ERRORS = None
_INFER_FALLBACKS = None
_LATENCY_HIST = None
_COST_GAUGE = None


def _get_metrics():
    global _INFER_REQUESTS, _INFER_ERRORS, _INFER_FALLBACKS, _LATENCY_HIST, _COST_GAUGE
    if _INFER_REQUESTS is None:
        try:
            from prometheus_client import Counter, Histogram, Gauge
            _INFER_REQUESTS = Counter(
                "ai_inference_requests_total",
                "Total AI inference requests",
                ["org_id", "model_name"],
            )
            _INFER_ERRORS = Counter(
                "ai_inference_errors_total",
                "AI inference errors",
                ["org_id", "model_name", "error_code"],
            )
            _INFER_FALLBACKS = Counter(
                "ai_inference_fallbacks_total",
                "AI fallbacks used",
                ["org_id", "fallback_model"],
            )
            _LATENCY_HIST = Histogram(
                "ai_inference_latency_seconds",
                "AI inference latency",
                ["org_id", "model_name"],
                buckets=(0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0),
            )
            _COST_GAUGE = Gauge(
                "ai_cost_usd_total",
                "Cumulative AI cost USD (per org)",
                ["org_id"],
            )
        except ImportError:
            logger.debug("prometheus_client not installed; telemetry metrics disabled")
    return _INFER_REQUESTS, _INFER_ERRORS, _INFER_FALLBACKS, _LATENCY_HIST, _COST_GAUGE


def _safe_label(s: Optional[str], max_len: int = 64) -> str:
    """Return a safe Prometheus label value (bounded, no high cardinality)."""
    if s is None or s == "":
        return "unknown"
    s = str(s).strip()[:max_len]
    return s or "unknown"


def build_ai_event_envelope(
    *,
    request_id: str,
    endpoint: str,
    model_name: str,
    org_id: str = "default",
    client_id: Optional[str] = None,
    user_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    model_version: Optional[str] = None,
    adapter_id: Optional[str] = None,
    input_size_bytes: Optional[int] = None,
    output_size_bytes: Optional[int] = None,
    latency_ms: int,
    compute_ms: Optional[int] = None,
    cost_usd: float = 0.0,
    success: bool,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
    fallback_used: bool = False,
    fallback_reason: Optional[str] = None,
    fallback_model: Optional[str] = None,
    provenance: Optional[Dict[str, Any]] = None,
    tags: Optional[Dict[str, Any]] = None,
    consent: bool = False,
) -> Dict[str, Any]:
    """Build the ai_events row dict. error_message truncated and must not contain PHI."""
    err_msg = (error_message or "")[:1000] if error_message else None
    return {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "client_id": client_id,
        "user_id": user_id,
        "request_id": request_id,
        "trace_id": trace_id,
        "endpoint": endpoint,
        "model_name": model_name,
        "model_version": model_version,
        "adapter_id": adapter_id,
        "input_size_bytes": input_size_bytes,
        "output_size_bytes": output_size_bytes,
        "latency_ms": latency_ms,
        "compute_ms": compute_ms,
        "cost_usd": round(float(cost_usd), 6),
        "success": success,
        "error_code": error_code,
        "error_message": err_msg,
        "fallback_used": fallback_used,
        "fallback_reason": fallback_reason,
        "fallback_model": fallback_model,
        "provenance": json.dumps(provenance or {}),
        "tags": json.dumps(tags or {}),
        "consent": consent,
    }


def _emit_to_db(envelope: Dict[str, Any]) -> None:
    """Insert one event into ai_events. Best-effort; log and continue on failure."""
    try:
        from app.services.db_cloudsql import is_cloudsql_enabled
        if not is_cloudsql_enabled():
            return
        from app.services.cloudsql_connector import get_engine
        from sqlalchemy import text
        engine = get_engine()
        sql = text("""
            INSERT INTO ai_events (
                id, org_id, client_id, user_id, request_id, trace_id, endpoint,
                model_name, model_version, adapter_id, input_size_bytes, output_size_bytes,
                latency_ms, compute_ms, cost_usd, success, error_code, error_message,
                fallback_used, fallback_reason, fallback_model, provenance, tags, consent
            ) VALUES (
                :id::uuid, :org_id, :client_id, :user_id, :request_id, :trace_id, :endpoint,
                :model_name, :model_version, :adapter_id, :input_size_bytes, :output_size_bytes,
                :latency_ms, :compute_ms, :cost_usd, :success, :error_code, :error_message,
                :fallback_used, :fallback_reason, :fallback_model, :provenance::jsonb, :tags::jsonb, :consent
            )
        """)
        with engine.begin() as conn:
            conn.execute(sql, envelope)
    except Exception as e:
        logger.exception("Failed to write ai_events telemetry: %s", e)


def _emit_to_prometheus(envelope: Dict[str, Any]) -> None:
    """Record metrics. Labels are bounded."""
    req, err, fall, hist, cost = _get_metrics()
    if req is None:
        return
    org = _safe_label(envelope.get("org_id"))
    model = _safe_label(envelope.get("model_name"))
    req.labels(org_id=org, model_name=model).inc()
    hist.labels(org_id=org, model_name=model).observe(
        (envelope.get("latency_ms") or 0) / 1000.0
    )
    cost.labels(org_id=org).inc(envelope.get("cost_usd") or 0)
    if not envelope.get("success"):
        ec = _safe_label(envelope.get("error_code"), max_len=32)
        err.labels(org_id=org, model_name=model, error_code=ec).inc()
    if envelope.get("fallback_used"):
        fm = _safe_label(envelope.get("fallback_model"))
        fall.labels(org_id=org, fallback_model=fm).inc()


def emit_ai_event(envelope: Dict[str, Any]) -> None:
    """
    Emit one AI event to DB (if Cloud SQL enabled) and Prometheus.
    Never raises; best-effort so inference is not blocked.
    """
    try:
        _emit_to_prometheus(envelope)
    except Exception as e:
        logger.debug("Prometheus emit failed: %s", e)
    try:
        _emit_to_db(envelope)
    except Exception:
        pass  # already logged in _emit_to_db
