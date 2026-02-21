"""
Phase 4: Bias & fairness metrics — demographic parity, equalized odds, FPR/FNR by group.
Inputs: predictions (0/1), labels (0/1), groups (protected attribute values).
"""
from typing import Dict, Any
import numpy as np


def demographic_parity(predictions: np.ndarray, groups: np.ndarray) -> Dict[Any, float]:
    """
    Positive rate per group (P(ŷ=1 | group)). For parity, rates should be similar.
    Returns dict group_value -> positive_rate.
    """
    rates = {}
    for group in np.unique(groups):
        group_preds = predictions[groups == group]
        rates[group] = float(np.mean(group_preds))
    return rates


def equalized_odds(
    predictions: np.ndarray, labels: np.ndarray, groups: np.ndarray
) -> Dict[Any, Dict[str, float]]:
    """
    FPR and FNR per group. Equalized odds holds when FPR and FNR are similar across groups.
    Returns dict group_value -> {"fpr": float, "fnr": float}.
    """
    metrics = {}
    for group in np.unique(groups):
        group_idx = groups == group
        pred_g = predictions[group_idx]
        label_g = labels[group_idx]
        tn = int(((predictions == 0) & (labels == 0) & group_idx).sum())
        fp = int(((predictions == 1) & (labels == 0) & group_idx).sum())
        fn = int(((predictions == 0) & (labels == 1) & group_idx).sum())
        tp = int(((predictions == 1) & (labels == 1) & group_idx).sum())
        n_neg = tn + fp
        n_pos = tp + fn
        fpr = fp / max(1, n_neg)
        fnr = fn / max(1, n_pos)
        metrics[group] = {"fpr": float(fpr), "fnr": float(fnr)}
    return metrics


def false_positive_rate(predictions: np.ndarray, labels: np.ndarray, groups: np.ndarray) -> Dict[Any, float]:
    """FPR per group."""
    eq = equalized_odds(predictions, labels, groups)
    return {g: m["fpr"] for g, m in eq.items()}


def false_negative_rate(predictions: np.ndarray, labels: np.ndarray, groups: np.ndarray) -> Dict[Any, float]:
    """FNR per group."""
    eq = equalized_odds(predictions, labels, groups)
    return {g: m["fnr"] for g, m in eq.items()}


def compute_fairness_row(
    model_name: str,
    protected_attribute: str,
    predictions: np.ndarray,
    labels: np.ndarray,
    groups: np.ndarray,
    window_start=None,
    window_end=None,
) -> Dict[str, Any]:
    """
    One row per group for fairness_metrics table: group_value, fpr, fnr,
    demographic_parity (positive rate), equalized_odds (e.g. max |FPR_i - FPR_j| or 1 - that).
    """
    dp = demographic_parity(predictions, groups)
    eq = equalized_odds(predictions, labels, groups)
    rows = []
    for group in np.unique(groups):
        fpr = eq[group]["fpr"]
        fnr = eq[group]["fnr"]
        parity = dp.get(group, 0.0)
        # Simple equalized odds gap: max absolute difference in FPR/FNR across groups
        fpr_vals = [eq[g]["fpr"] for g in eq]
        fnr_vals = [eq[g]["fnr"] for g in eq]
        eo_gap = max(
            max(fpr_vals) - min(fpr_vals) if fpr_vals else 0,
            max(fnr_vals) - min(fnr_vals) if fnr_vals else 0,
        )
        equalized_odds_score = 1.0 - min(eo_gap, 1.0)  # 1 = perfect equality
        rows.append({
            "model_name": model_name,
            "protected_attribute": protected_attribute,
            "group_value": str(group),
            "false_positive_rate": fpr,
            "false_negative_rate": fnr,
            "demographic_parity": parity,
            "equalized_odds": equalized_odds_score,
            "window_start": window_start,
            "window_end": window_end,
        })
    return rows


def structured_bias_report(
    predictions: np.ndarray,
    labels: np.ndarray,
    groups: np.ndarray,
) -> Dict[str, Any]:
    """
    Return structured bias report for dashboards and export:
    demographic_parity, equalized_odds, disparate_impact, flag.
    """
    dp = demographic_parity(predictions, groups)
    eq = equalized_odds(predictions, labels, groups)
    pos_rates = list(dp.values())
    min_rate = min(pos_rates) if pos_rates else 0.0
    max_rate = max(pos_rates) if pos_rates else 1.0
    disparate_impact = (min_rate / max_rate) if max_rate > 0 else 1.0
    fpr_vals = [eq[g]["fpr"] for g in eq]
    fnr_vals = [eq[g]["fnr"] for g in eq]
    eo_gap = max(
        max(fpr_vals) - min(fpr_vals) if fpr_vals else 0,
        max(fnr_vals) - min(fnr_vals) if fnr_vals else 0,
    )
    flag = disparate_impact < 0.8 or eo_gap > 0.2
    return {
        "demographic_parity": dp,
        "equalized_odds": eq,
        "disparate_impact": round(float(disparate_impact), 2),
        "flag": bool(flag),
    }
