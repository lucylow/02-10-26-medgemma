"""
Phase 2: Export drift metrics to Prometheus (ai_embedding_psi gauge).
Call from /metrics scrape or a periodic job.
"""
import logging
from typing import Any, List

logger = logging.getLogger("app.telemetry.drift_exporter")

_drift_gauge = None


def _get_drift_gauge():
    global _drift_gauge
    if _drift_gauge is None:
        try:
            from prometheus_client import Gauge
            _drift_gauge = Gauge(
                "ai_embedding_psi",
                "PSI drift value per feature",
                ["model_name", "feature_name"],
            )
        except ImportError:
            logger.debug("prometheus_client not installed")
    return _drift_gauge


def export_drift_metrics(fetch_all_fn=None) -> None:
    """
    Set Prometheus ai_embedding_psi gauges from DB.
    fetch_all_fn: callable() -> list of dicts with model_name, feature_name, psi_value.
                  If None, uses Cloud SQL when enabled and queries drift_metrics.
    """
    gauge = _get_drift_gauge()
    if gauge is None:
        return
    if fetch_all_fn is not None:
        rows = fetch_all_fn()
    else:
        rows = _fetch_drift_from_db()
    if not rows:
        return
    for r in rows:
        model = (r.get("model_name") or "unknown")[:64]
        feature = (r.get("feature_name") or "unknown")[:64]
        try:
            gauge.labels(model_name=model, feature_name=feature).set(float(r.get("psi_value", 0)))
        except Exception as e:
            logger.debug("Set gauge failed: %s", e)


def _fetch_drift_from_db() -> List[dict]:
    """Query drift_metrics from Cloud SQL / observability DB."""
    try:
        from app.services.db_cloudsql import is_cloudsql_enabled
        if not is_cloudsql_enabled():
            return []
    except Exception:
        return []
    try:
        from app.services.cloudsql_connector import get_engine
        from sqlalchemy import text
        engine = get_engine()
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT model_name, feature_name, psi_value
                FROM drift_metrics
                ORDER BY created_at DESC
                LIMIT 200
            """)).fetchall()
        return [{"model_name": r[0], "feature_name": r[1], "psi_value": r[2]} for r in rows]
    except Exception as e:
        logger.warning("Fetch drift_metrics failed: %s", e)
        return []
