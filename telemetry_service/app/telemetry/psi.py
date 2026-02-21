"""
Population Stability Index (PSI) for drift monitoring.
Used by Celery tasks to compute daily drift metrics.
"""
import numpy as np
from typing import Dict, List, Tuple


def _get_bins(ref: np.ndarray, curr: np.ndarray, buckets: int) -> np.ndarray:
    combined = np.concatenate([ref, curr])
    quantiles = np.linspace(0, 1, buckets + 1)
    bins = np.unique(np.quantile(combined, quantiles))
    if len(bins) < 2:
        bins = np.array([combined.min(), combined.max() + 1e-6])
    return bins


def _pct_by_bucket(arr: np.ndarray, bins: np.ndarray) -> np.ndarray:
    counts, _ = np.histogram(arr, bins=bins)
    eps = 1e-6
    total = counts.sum()
    return (counts + eps) / (total + eps * len(counts))


def calculate_psi(
    reference: List[float],
    current: List[float],
    buckets: int = 10,
) -> Tuple[float, Dict]:
    """
    Compute PSI between reference and current numeric arrays.
    Returns (psi_total, details_dict).
    """
    ref = np.asarray(reference, dtype=float)
    curr = np.asarray(current, dtype=float)
    if ref.size == 0 or curr.size == 0:
        raise ValueError("Reference and current arrays must be non-empty.")
    bins = _get_bins(ref, curr, buckets)
    ref_pct = _pct_by_bucket(ref, bins)
    curr_pct = _pct_by_bucket(curr, bins)
    contributions = (ref_pct - curr_pct) * np.log(ref_pct / curr_pct)
    psi_total = float(np.sum(contributions))
    bin_ranges = [
        (float(bins[i]), float(bins[i + 1])) for i in range(len(bins) - 1)
    ]
    details = {
        "psi": psi_total,
        "buckets": [
            {
                "bin": i,
                "range": bin_ranges[i],
                "ref_pct": float(ref_pct[i]),
                "cur_pct": float(curr_pct[i]),
                "contribution": float(contributions[i]),
            }
            for i in range(len(ref_pct))
        ],
    }
    return psi_total, details
