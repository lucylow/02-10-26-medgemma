"""
Clinician Study Framework — reader study, inter-rater reliability.

3x3 Reader Study: AI assistance levels × reader types.
Metrics: sensitivity, specificity, AUC, reading time, confidence calibration.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np


def fleiss_kappa(
    ratings: List[List[int]],
    categories: Optional[List[str]] = None,
) -> float:
    """
    Fleiss' kappa for multi-rater agreement.
    ratings: list of [rater1, rater2, ...] per subject; values 0..n_cat-1
    """
    ratings = np.asarray(ratings)
    n_subjects, n_raters = ratings.shape
    n_categories = int(ratings.max()) + 1 if ratings.size > 0 else 4

    # P_i: extent of agreement for subject i
    p_i = np.zeros(n_subjects)
    for i in range(n_subjects):
        counts = np.bincount(ratings[i].astype(int), minlength=n_categories)
        p_i[i] = (np.sum(counts**2) - n_raters) / (n_raters * (n_raters - 1))
    P_bar = np.mean(p_i)

    # P_e: expected agreement by chance
    all_ratings = ratings.flatten()
    p_j = np.bincount(all_ratings.astype(int), minlength=n_categories) / (n_subjects * n_raters)
    P_e = np.sum(p_j**2)

    if P_e >= 1:
        return 0.0
    kappa = (P_bar - P_e) / (1 - P_e)
    return float(kappa)


def cohen_kappa_multiclass(y1: np.ndarray, y2: np.ndarray, n_classes: int = 4) -> float:
    """Cohen's kappa for two raters, multiclass."""
    from sklearn.metrics import cohen_kappa_score
    return float(cohen_kappa_score(y1, y2))


def reader_study_metrics(
    reader_labels: Dict[str, List[int]],
    gold_labels: List[int],
    ai_assist_levels: Optional[Dict[str, str]] = None,
) -> Dict:
    """
    Compute per-reader metrics: sensitivity, specificity, AUC.
    reader_labels: {"reader_1": [0,1,2,...], "reader_2": [...]}
    gold_labels: ground truth
    """
    results = {}
    gold = np.array(gold_labels)
    # Binary: refer (3) vs non-refer
    gold_bin = (gold == 3).astype(int)
    for reader, preds in reader_labels.items():
        p = np.array(preds)
        if len(p) != len(gold):
            continue
        p_bin = (p == 3).astype(int)
        tp = ((gold_bin == 1) & (p_bin == 1)).sum()
        tn = ((gold_bin == 0) & (p_bin == 0)).sum()
        fp = ((gold_bin == 0) & (p_bin == 1)).sum()
        fn = ((gold_bin == 1) & (p_bin == 0)).sum()
        sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        results[reader] = {
            "sensitivity": sens,
            "specificity": spec,
            "n": len(preds),
        }
    return results
