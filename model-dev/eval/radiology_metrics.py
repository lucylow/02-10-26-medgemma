"""
radiology_metrics.py — Radiology-specific evaluation for PediScreen AI.

Metrics:
  - Bone Age: MAE (Greulich-Pyle ±2mo clinical target)
  - ROP: Zone/Stage/Plus multi-label AUC
  - Fracture: F1, sensitivity at 95% recall

Usage:
  from model_dev.eval.radiology_metrics import RadiologyMetrics
  m = RadiologyMetrics()
  mae = m.bone_age_mae(predictions, ground_truth)
  rop = m.rop_auc(zone_preds, stage_preds, labels)
  f1 = m.fracture_f1(fracture_preds, fracture_gt)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence, Union

import numpy as np


class RadiologyMetrics:
    """Bone Age MAE, ROP AUC, Fracture F1 and sensitivity-at-95-recall."""

    @staticmethod
    def bone_age_mae(
        predictions: Sequence[float],
        ground_truth: Sequence[float],
    ) -> float:
        """Greulich-Pyle bone age accuracy (MAE in months). Clinical target ±2–3mo."""
        if not predictions or len(predictions) != len(ground_truth):
            return float("nan")
        return float(np.mean(np.abs(np.asarray(predictions) - np.asarray(ground_truth))))

    @staticmethod
    def bone_age_within_months(
        predictions: Sequence[float],
        ground_truth: Sequence[float],
        margin_months: float = 2.0,
    ) -> float:
        """Fraction of predictions within ±margin_months of ground truth."""
        if not predictions or len(predictions) != len(ground_truth):
            return float("nan")
        p, g = np.asarray(predictions), np.asarray(ground_truth)
        within = np.abs(p - g) <= margin_months
        return float(np.mean(within))

    @staticmethod
    def rop_auc(
        labels: Dict[str, Union[List[int], np.ndarray]],
        predictions: Dict[str, Union[List[float], np.ndarray]],
    ) -> Dict[str, float]:
        """
        ROP Zone/Stage/Plus multi-label AUC.
        labels: dict with e.g. "zone_i", "stage_2", "plus" (binary 0/1)
        predictions: same keys, continuous scores in [0,1].
        """
        try:
            from sklearn.metrics import roc_auc_score
        except ImportError:
            return {k: float("nan") for k in labels}

        result: Dict[str, float] = {}
        for key in labels:
            y_true = np.asarray(labels[key]).ravel()
            if key not in predictions:
                continue
            y_score = np.asarray(predictions[key]).ravel()
            if np.unique(y_true).size < 2:
                result[f"{key}_auc"] = float("nan")
                continue
            try:
                result[f"{key}_auc"] = float(roc_auc_score(y_true, y_score))
            except Exception:
                result[f"{key}_auc"] = float("nan")
        return result

    @staticmethod
    def fracture_f1(
        fracture_preds: Union[List[int], List[float], np.ndarray],
        fracture_gt: Union[List[int], np.ndarray],
        threshold: float = 0.5,
    ) -> Dict[str, float]:
        """Fracture detection: F1 and sensitivity at 95% recall."""
        try:
            from sklearn.metrics import (
                f1_score,
                precision_recall_curve,
                precision_score,
                recall_score,
            )
        except ImportError:
            return {"f1_score": float("nan"), "sensitivity_95": float("nan")}

        y_true = np.asarray(fracture_gt).ravel()
        y_score = np.asarray(fracture_preds).ravel()
        if y_score.dtype.kind in ("i", "b"):
            y_pred = (y_score > threshold).astype(int)
        else:
            y_pred = (y_score > threshold).astype(int)

        f1 = float(f1_score(y_true, y_pred, zero_division=0))
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))

        sensitivity_95 = float("nan")
        if np.unique(y_true).size >= 2 and y_score.dtype.kind == "f":
            precision_curve, recall_curve, thresholds = precision_recall_curve(
                y_true, y_score
            )
            idx = np.argmax(recall_curve >= 0.95) if np.any(recall_curve >= 0.95) else -1
            if idx >= 0:
                sensitivity_95 = float(precision_curve[idx])

        return {
            "f1_score": f1,
            "precision": prec,
            "recall": rec,
            "sensitivity_95": sensitivity_95,
        }

    @staticmethod
    def growth_zscore_correlation(
        pred_z: Sequence[float],
        ref_z: Sequence[float],
    ) -> float:
        """Pearson r between predicted and reference WHO Z-scores (growth tracking)."""
        if not pred_z or len(pred_z) != len(ref_z):
            return float("nan")
        p, r = np.asarray(pred_z), np.asarray(ref_z)
        if np.std(p) == 0 or np.std(r) == 0:
            return float("nan")
        return float(np.corrcoef(p, r)[0, 1])


def parse_json_predictions(
    raw_outputs: List[str],
    keys_float: Optional[List[str]] = None,
    keys_bool: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Parse model text outputs that contain a single JSON object per item.
    keys_float: extract these as float (e.g. bone_age_months, confidence).
    keys_bool: extract these as bool (e.g. plus_disease, fracture_present).
    """
    import re
    keys_float = keys_float or ["bone_age_months", "confidence", "z_score"]
    keys_bool = keys_bool or ["plus_disease", "fracture_present"]
    parsed = []
    for text in raw_outputs:
        obj = {}
        match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
        if match:
            try:
                import json as _json
                obj = _json.loads(match.group())
            except Exception:
                pass
        for k in keys_float:
            if k in obj and obj[k] is not None:
                try:
                    obj[k] = float(obj[k])
                except (TypeError, ValueError):
                    pass
        for k in keys_bool:
            if k in obj and obj[k] is not None:
                obj[k] = bool(obj[k])
        parsed.append(obj)
    return parsed
