"""
Evaluation metrics: sensitivity, specificity, PPV, NPV, accuracy, F1.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


def binary_metrics_from_cm(tp: int, tn: int, fp: int, fn: int) -> dict:
    """Compute sensitivity, specificity, PPV, NPV from counts."""
    sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    ppv = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0
    return {
        "sensitivity": sens,
        "specificity": spec,
        "ppv": ppv,
        "npv": npv,
        "accuracy": (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0.0,
    }


def classification_metrics(
    y_true: List[str],
    y_pred: List[str],
    labels: Optional[List[str]] = None,
    positive_label: str = "refer",
) -> dict:
    """Multi-class metrics; also binary metrics treating positive_label as positive."""
    if labels is None:
        labels = sorted(set(y_true) | set(y_pred))
    acc = accuracy_score(y_true, y_pred)
    f1_macro = f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)
    f1_weighted = f1_score(y_true, y_pred, labels=labels, average="weighted", zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    # Binary vs positive_label
    y_true_bin = [1 if y == positive_label else 0 for y in y_true]
    y_pred_bin = [1 if y == positive_label else 0 for y in y_pred]
    tn, fp, fn, tp = confusion_matrix(y_true_bin, y_pred_bin, labels=[0, 1]).ravel()
    bin_met = binary_metrics_from_cm(int(tp), int(tn), int(fp), int(fn))
    return {
        "accuracy": acc,
        "f1_macro": f1_macro,
        "f1_weighted": f1_weighted,
        "confusion_matrix": cm.tolist(),
        "labels": labels,
        "sensitivity": bin_met["sensitivity"],
        "specificity": bin_met["specificity"],
        "ppv": bin_met["ppv"],
        "npv": bin_met["npv"],
    }
