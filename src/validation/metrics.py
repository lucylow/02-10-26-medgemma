"""
Clinical Metrics — sensitivity, specificity, PPV, NPV with 95% CIs.

Level 1: Technical Accuracy (Must-Have)
- Sensitivity (Se) ≥ 95% (prioritize no missed cases)
- Specificity (Sp) ≥ 80%
- PPV/NPV with 95% CIs
- AUC-ROC ≥ 0.85 (external validation)
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy import stats
from sklearn.metrics import (
    confusion_matrix,
    roc_auc_score,
    cohen_kappa_score,
)

RISK_LABELS = ["on_track", "monitor", "discuss", "refer"]
RISK_ORDER = {r: i for i, r in enumerate(RISK_LABELS)}


def _risk_to_int(risk: str) -> int:
    """Map risk string to 0-3 index."""
    r = str(risk).lower().strip()
    return RISK_ORDER.get(r, 0)


def _ensure_numeric(y_true: np.ndarray, y_pred: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Convert string/categorical labels to 0-3 indices."""
    if y_true.dtype == object or y_true.dtype.kind in ("U", "S"):
        y_true = np.array([_risk_to_int(str(x)) for x in y_true])
    if y_pred.dtype == object or y_pred.dtype.kind in ("U", "S"):
        y_pred = np.array([_risk_to_int(str(x)) for x in y_pred])
    return y_true.astype(int), y_pred.astype(int)


class ClinicalMetrics:
    """
    Core clinical metric computation with bootstrap confidence intervals.

    Supports 4-class risk stratification: on_track, monitor, discuss, refer.
    """

    def __init__(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_scores: Optional[np.ndarray] = None,
        labels: Optional[List[str]] = None,
    ):
        """
        Args:
            y_true: Ground truth labels (risk level indices or strings)
            y_pred: Predicted labels
            y_scores: Probability scores for AUC (optional, shape [n, 4] or [n])
            labels: Label names (default: on_track, monitor, discuss, refer)
        """
        self.labels = labels or RISK_LABELS
        self.y_true, self.y_pred = _ensure_numeric(
            np.asarray(y_true), np.asarray(y_pred)
        )
        self.y_scores = np.asarray(y_scores) if y_scores is not None else None

    @property
    def confusion_matrix(self) -> np.ndarray:
        """Confusion matrix with labels [on_track, monitor, discuss, refer]."""
        return confusion_matrix(
            self.y_true,
            self.y_pred,
            labels=list(range(len(self.labels))),
        )

    @property
    def sensitivity_by_risk(self) -> Dict[str, float]:
        """Sensitivity per risk level. Critical: no missed high-risk (refer) cases."""
        cm = self.confusion_matrix
        result = {}
        for i, label in enumerate(self.labels):
            row_sum = cm[i, :].sum()
            if row_sum > 0:
                result[label] = float(cm[i, i] / row_sum)
            else:
                result[label] = 0.0
        return result

    @property
    def specificity_by_risk(self) -> Dict[str, float]:
        """Specificity per risk level (TN / (TN + FP) for one-vs-rest)."""
        cm = self.confusion_matrix
        result = {}
        n_classes = len(self.labels)
        for i, label in enumerate(self.labels):
            tn = cm.sum() - cm[i, :].sum() - cm[:, i].sum() + cm[i, i]
            fp = cm[:, i].sum() - cm[i, i]
            if (tn + fp) > 0:
                result[label] = float(tn / (tn + fp))
            else:
                result[label] = 0.0
        return result

    def binary_sensitivity_specificity(
        self,
        positive_classes: Optional[List[str]] = None,
    ) -> Dict[str, float]:
        """
        Binary metrics: positive = refer (or refer+discuss).
        Use for regulatory thresholds: Se ≥ 95%, Sp ≥ 80%.
        """
        pos = positive_classes or ["refer"]
        pos_indices = [self.labels.index(p) for p in pos if p in self.labels]
        y_true_bin = np.isin(self.y_true, pos_indices).astype(int)
        y_pred_bin = np.isin(self.y_pred, pos_indices).astype(int)

        tp = ((y_true_bin == 1) & (y_pred_bin == 1)).sum()
        tn = ((y_true_bin == 0) & (y_pred_bin == 0)).sum()
        fp = ((y_true_bin == 0) & (y_pred_bin == 1)).sum()
        fn = ((y_true_bin == 1) & (y_pred_bin == 0)).sum()

        sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        ppv = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0

        return {
            "sensitivity": sens,
            "specificity": spec,
            "ppv": ppv,
            "npv": npv,
            "tp": int(tp),
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
        }

    def bootstrap_ci(
        self,
        metric_func,
        n_bootstrap: int = 1000,
        confidence: float = 0.95,
        random_state: Optional[int] = None,
    ) -> Tuple[float, float, float]:
        """
        Bootstrap 95% CI for a scalar metric.
        Returns (point_estimate, lower_ci, upper_ci).
        """
        rng = np.random.default_rng(random_state)
        n = len(self.y_true)
        stats_list = []
        for _ in range(n_bootstrap):
            idx = rng.integers(0, n, size=n)
            y_t = self.y_true[idx]
            y_p = self.y_pred[idx]
            m = ClinicalMetrics(y_t, y_p, self.y_scores[idx] if self.y_scores is not None else None)
            stats_list.append(metric_func(m))
        arr = np.array(stats_list)
        alpha = 1 - confidence
        lower = np.percentile(arr, 100 * alpha / 2)
        upper = np.percentile(arr, 100 * (1 - alpha / 2))
        point = metric_func(self)
        return float(point), float(lower), float(upper)

    def auc_roc(self) -> float:
        """AUC-ROC for binary (refer vs non-refer) or multiclass."""
        if self.y_scores is None:
            return 0.0
        y_true_bin = (self.y_true == 3).astype(int)  # refer = positive
        if self.y_scores.ndim == 2:
            y_scores_bin = self.y_scores[:, 3]  # refer class prob
        else:
            y_scores_bin = self.y_scores
        if len(np.unique(y_true_bin)) < 2:
            return 0.0
        return float(roc_auc_score(y_true_bin, y_scores_bin))

    def cohen_kappa(self) -> float:
        """Inter-rater reliability: AI vs gold standard."""
        return float(cohen_kappa_score(self.y_true, self.y_pred))

    def compute_all(
        self,
        n_bootstrap: int = 1000,
        include_ci: bool = True,
    ) -> Dict:
        """Compute full metric suite with optional CIs."""
        binary = self.binary_sensitivity_specificity(positive_classes=["refer"])
        out = {
            "sensitivity": binary["sensitivity"],
            "specificity": binary["specificity"],
            "ppv": binary["ppv"],
            "npv": binary["npv"],
            "sensitivity_by_risk": self.sensitivity_by_risk,
            "specificity_by_risk": self.specificity_by_risk,
            "confusion_matrix": self.confusion_matrix.tolist(),
            "n": int(len(self.y_true)),
            "cohen_kappa": self.cohen_kappa(),
        }
        if self.y_scores is not None:
            out["auc_roc"] = self.auc_roc()

        if include_ci and n_bootstrap > 0:
            def sens(m):
                return m.binary_sensitivity_specificity()["sensitivity"]
            def spec(m):
                return m.binary_sensitivity_specificity()["specificity"]
            _, s_lo, s_hi = self.bootstrap_ci(sens, n_bootstrap=n_bootstrap)
            _, p_lo, p_hi = self.bootstrap_ci(spec, n_bootstrap=n_bootstrap)
            out["sensitivity_ci_95"] = [s_lo, s_hi]
            out["specificity_ci_95"] = [p_lo, p_hi]

        return out
