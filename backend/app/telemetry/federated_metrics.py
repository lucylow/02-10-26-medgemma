"""
Phase 3: Prometheus gauges for federated learning (global loss, accuracy per round).
Export from latest federated_round_metrics or set from strategy.
"""
import logging
from typing import List

logger = logging.getLogger("app.telemetry.federated")

_fed_loss = None
_fed_accuracy = None


def _get_gauges():
    global _fed_loss, _fed_accuracy
    if _fed_loss is None:
        try:
            from prometheus_client import Gauge
            _fed_loss = Gauge(
                "federated_global_loss",
                "Global loss (last round or latest from DB)",
                ["round"],
            )
            _fed_accuracy = Gauge(
                "federated_global_accuracy",
                "Global accuracy (last round or latest from DB)",
                ["round"],
            )
        except ImportError:
            pass
    return _fed_loss, _fed_accuracy


def set_federated_metrics(round_number: int, loss: float = None, accuracy: float = None) -> None:
    """Set Prometheus gauges for one round (e.g. from TelemetryFedAvg)."""
    loss_g, acc_g = _get_gauges()
    if loss_g is None:
        return
    r = str(round_number)
    if loss is not None:
        loss_g.labels(round=r).set(loss)
    if accuracy is not None:
        acc_g.labels(round=r).set(accuracy)


def export_federated_metrics_from_db(fetch_fn=None) -> None:
    """Populate Prometheus from federated_round_metrics (e.g. last 50 rounds)."""
    loss_g, acc_g = _get_gauges()
    if loss_g is None or acc_g is None:
        return
    rows = fetch_fn() if fetch_fn else _fetch_latest_rounds()
    for r in rows:
        rnd = str(r.get("round_number", 0))
        if r.get("global_loss") is not None:
            loss_g.labels(round=rnd).set(float(r["global_loss"]))
        if r.get("global_accuracy") is not None:
            acc_g.labels(round=rnd).set(float(r["global_accuracy"]))


def _fetch_latest_rounds(limit: int = 50) -> List[dict]:
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
                SELECT round_number, global_loss, global_accuracy
                FROM federated_round_metrics
                ORDER BY created_at DESC
                LIMIT :limit
            """), {"limit": limit}).fetchall()
        return [
            {"round_number": r[0], "global_loss": r[1], "global_accuracy": r[2]}
            for r in rows
        ]
    except Exception as e:
        logger.warning("Fetch federated_round_metrics failed: %s", e)
        return []
