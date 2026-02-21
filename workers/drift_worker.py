"""
Phase 2: Drift aggregator worker — computes PSI from embedding_current_stats vs
embedding_baseline_stats and writes drift_metrics. Run on a schedule (e.g. cron or Celery).
Uses DATABASE_URL or Cloud SQL when available.
"""
import logging
import os
from typing import Dict, List, Tuple

logger = logging.getLogger("workers.drift")

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore

# Prefer backend telemetry PSI when run from repo root; otherwise relative import
try:
    from app.telemetry.psi import calculate_psi, classify_drift
except ImportError:
    try:
        from backend.app.telemetry.psi import calculate_psi, classify_drift
    except ImportError:
        from telemetry.psi import calculate_psi, classify_drift

WINDOW_QUERY = """
SELECT feature_name, bin_index, observed_ratio
FROM embedding_current_stats
WHERE model_name = :model_name
AND window_start >= NOW() - interval '24 hours'
ORDER BY feature_name, bin_index
"""

BASELINE_QUERY = """
SELECT feature_name, bin_index, expected_ratio
FROM embedding_baseline_stats
WHERE model_name = :model_name
ORDER BY feature_name, bin_index
"""

INSERT_DRIFT = """
INSERT INTO drift_metrics (model_name, feature_name, psi_value, drift_level, window_start, window_end)
VALUES (:model_name, :feature_name, :psi_value, :drift_level, :window_start, :window_end)
"""


def _get_engine():
    """SQLAlchemy engine for observability DB (Cloud SQL or DATABASE_URL)."""
    from sqlalchemy import create_engine
    url = os.environ.get("DATABASE_URL") or os.environ.get("OBSERVABILITY_DATABASE_URL")
    if url:
        return create_engine(url)
    try:
        from app.services.db_cloudsql import is_cloudsql_enabled
        if is_cloudsql_enabled():
            from app.services.cloudsql_connector import get_engine
            return get_engine()
    except Exception as e:
        logger.debug("Cloud SQL not available: %s", e)
    return None


def _aggregate_by_feature(rows: List[Tuple]) -> Dict[str, List[float]]:
    """Group (feature_name, bin_index, ratio) rows into feature -> sorted ratios by bin_index."""
    by_feature: Dict[str, Dict[int, float]] = {}
    for feature, bin_idx, ratio in rows:
        by_feature.setdefault(feature, {})[bin_idx] = float(ratio)
    out = {}
    for feature, bins in by_feature.items():
        max_idx = max(bins.keys())
        out[feature] = [bins.get(i, 1e-6) for i in range(max_idx + 1)]
    return out


def compute_drift_for_model(model_name: str, window_start=None, window_end=None) -> int:
    """
    Compute PSI per feature for one model and insert into drift_metrics.
    Returns number of drift_metrics rows inserted.
    """
    if np is None:
        logger.warning("numpy not installed; drift computation skipped")
        return 0
    engine = _get_engine()
    if engine is None:
        logger.warning("No database configured for drift worker")
        return 0
    from sqlalchemy import text
    inserted = 0
    with engine.begin() as conn:
        try:
            baseline_rows = conn.execute(text(BASELINE_QUERY), {"model_name": model_name}).fetchall()
            current_rows = conn.execute(text(WINDOW_QUERY), {"model_name": model_name}).fetchall()
        except Exception as e:
            logger.exception("Drift worker query failed: %s", e)
            return 0
        baseline = _aggregate_by_feature([(r[0], r[1], r[2]) for r in baseline_rows])
        current = _aggregate_by_feature([(r[0], r[1], r[2]) for r in current_rows])
        for feature in baseline:
            if feature not in current:
                continue
            exp = np.array(baseline[feature])
            obs = np.array(current[feature])
            if len(exp) != len(obs):
                logger.debug("Skip feature %s: bin count mismatch", feature)
                continue
            try:
                psi = calculate_psi(exp, obs)
            except Exception as e:
                logger.warning("PSI calc failed for %s: %s", feature, e)
                continue
            drift_level = classify_drift(psi)
            params = {
                "model_name": model_name,
                "feature_name": feature,
                "psi_value": float(psi),
                "drift_level": drift_level,
                "window_start": window_start,
                "window_end": window_end,
            }
            try:
                conn.execute(text(INSERT_DRIFT), params)
                inserted += 1
            except Exception as e:
                logger.warning("Insert drift_metrics failed: %s", e)
    return inserted


def run_drift_for_all_models(model_names: List[str] = None) -> int:
    """Run drift computation for given models, or discover from baseline table."""
    engine = _get_engine()
    if engine is None:
        return 0
    if model_names is None:
        from sqlalchemy import text
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT DISTINCT model_name FROM embedding_baseline_stats")).fetchall()
        model_names = [r[0] for r in rows]
    total = 0
    for m in model_names:
        total += compute_drift_for_model(m)
    return total
