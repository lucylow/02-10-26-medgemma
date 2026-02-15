"""
Drift Detection — temporal and distribution shift monitoring.

Production monitoring: CUSUM for drift, embedding/label shift detection.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy import stats


class DriftDetector:
    """
    Detects dataset shift for model monitoring.
    - Embedding drift: KS test on embedding distributions
    - Label shift: Chi-square on risk distributions
    """

    def __init__(
        self,
        reference_embeddings: Optional[np.ndarray] = None,
        reference_labels: Optional[np.ndarray] = None,
        n_bins: int = 10,
    ):
        self.reference_embeddings = np.asarray(reference_embeddings) if reference_embeddings is not None else None
        self.reference_labels = np.asarray(reference_labels) if reference_labels is not None else None
        self.n_bins = n_bins

    def embedding_drift(
        self,
        new_embeddings: np.ndarray,
        method: str = "ks",
    ) -> Dict:
        """
        KS test on embedding distributions (per dimension or aggregated).
        Returns p-value; low p-value indicates significant drift.
        """
        if self.reference_embeddings is None:
            return {"pvalue": 1.0, "drift_detected": False, "note": "No reference"}
        ref = np.asarray(self.reference_embeddings)
        new = np.asarray(new_embeddings)
        if ref.ndim == 1:
            ref = ref.reshape(-1, 1)
        if new.ndim == 1:
            new = new.reshape(-1, 1)
        # Use first dimension or mean across dims for simplicity
        ref_flat = ref.flatten() if ref.size > 0 else np.array([0.0])
        new_flat = new.flatten() if new.size > 0 else np.array([0.0])
        stat, pvalue = stats.ks_2samp(ref_flat, new_flat)
        return {
            "statistic": float(stat),
            "pvalue": float(pvalue),
            "drift_detected": pvalue < 0.05,
        }

    def label_shift(
        self,
        new_labels: np.ndarray,
        n_classes: int = 4,
    ) -> Dict:
        """
        Chi-square test on risk level distributions.
        """
        if self.reference_labels is None:
            return {"pvalue": 1.0, "drift_detected": False, "note": "No reference"}
        ref = np.asarray(self.reference_labels).flatten().astype(int)
        new = np.asarray(new_labels).flatten().astype(int)
        ref_counts = np.bincount(np.clip(ref, 0, n_classes - 1), minlength=n_classes)
        new_counts = np.bincount(np.clip(new, 0, n_classes - 1), minlength=n_classes)
        # Avoid zeros for chi2
        ref_counts = np.where(ref_counts == 0, 0.5, ref_counts)
        new_counts = np.where(new_counts == 0, 0.5, new_counts)
        stat, pvalue, _, _ = stats.chi2_contingency([ref_counts, new_counts])
        return {
            "statistic": float(stat),
            "pvalue": float(pvalue),
            "drift_detected": pvalue < 0.05,
        }

    def cusum_drift(
        self,
        metric_series: List[float],
        threshold: float = 5.0,
        k: float = 0.5,
    ) -> Dict:
        """
        CUSUM for detecting mean shift in a metric over time.
        """
        if len(metric_series) < 2:
            return {"drift_detected": False, "cusum_max": 0.0}
        x = np.array(metric_series)
        mu = np.mean(x)
        cusum_pos = np.zeros(len(x))
        cusum_neg = np.zeros(len(x))
        for i in range(1, len(x)):
            cusum_pos[i] = max(0, cusum_pos[i - 1] + x[i] - mu - k)
            cusum_neg[i] = max(0, cusum_neg[i - 1] + mu - x[i] - k)
        cusum_max = max(cusum_pos.max(), cusum_neg.max())
        return {
            "drift_detected": cusum_max > threshold,
            "cusum_max": float(cusum_max),
            "threshold": threshold,
        }
