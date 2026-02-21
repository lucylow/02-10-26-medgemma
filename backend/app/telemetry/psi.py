"""
Phase 2: PSI (Population Stability Index) for drift monitoring.
Simple API for drift_worker: expected/observed bin ratios → PSI value and drift level.
Real PSI computation with buckets; emit DRIFT_ALERT when PSI > 0.2 (moderate) or > 0.3 (severe).
"""
import numpy as np
from typing import List, Tuple, Union

EPS = 1e-6
PSI_MODERATE = 0.2
PSI_SEVERE = 0.3


def calculate_psi(expected: Union[np.ndarray, list], observed: Union[np.ndarray, list]) -> float:
    """Compute PSI from expected and observed bin ratios (same length, same order)."""
    expected = np.asarray(expected, dtype=float)
    observed = np.asarray(observed, dtype=float)
    expected = np.clip(expected, EPS, None)
    observed = np.clip(observed, EPS, None)
    psi = np.sum((observed - expected) * np.log(observed / expected))
    return float(psi)


def population_stability_index(
    expected: Union[np.ndarray, list],
    actual: Union[np.ndarray, list],
    buckets: int = 10,
) -> float:
    """
    Bin expected and actual into buckets, compute ratio distributions, return PSI.
    expected, actual: 1-d arrays of values (e.g. risk scores or feature values).
    """
    expected = np.asarray(expected, dtype=float)
    actual = np.asarray(actual, dtype=float)
    mn = min(np.min(expected), np.min(actual))
    mx = max(np.max(expected), np.max(actual))
    if mx <= mn:
        mx = mn + 1.0
    edges = np.linspace(mn, mx, buckets + 1)
    e_hist, _ = np.histogram(expected, bins=edges)
    a_hist, _ = np.histogram(actual, bins=edges)
    e_ratios = (e_hist + EPS) / (e_hist.sum() + EPS * buckets)
    a_ratios = (a_hist + EPS) / (a_hist.sum() + EPS * buckets)
    return calculate_psi(e_ratios.tolist(), a_ratios.tolist())


def classify_drift(psi: float) -> str:
    """Map PSI to drift level for alerts and dashboards."""
    if psi < 0.1:
        return "none"
    elif psi < 0.25:
        return "moderate"
    else:
        return "high"


def drift_alert_if_needed(psi: float) -> Tuple[bool, str]:
    """
    Trigger alert if PSI > 0.2 (moderate) or > 0.3 (severe).
    Returns (should_alert, severity).
    """
    if psi > PSI_SEVERE:
        return True, "HIGH"
    if psi > PSI_MODERATE:
        return True, "MODERATE"
    return False, "none"


def drift_event_payload(psi: float, severity: str) -> dict:
    """Emit event payload for DRIFT_ALERT: { event, severity }."""
    return {"event": "DRIFT_ALERT", "psi": psi, "severity": severity}
