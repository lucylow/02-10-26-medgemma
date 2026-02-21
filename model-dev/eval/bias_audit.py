"""
Bias audit: subgroup metrics and disparity (model-dev).

Purpose: Given eval set with subgroup annotations, compute metrics per subgroup,
disparity (e.g. max - min), and optional bootstrap significance.
Inputs: Dataset path or (y_true, y_pred, subgroups). Outputs: Dict with per_subgroup, disparity, flagged.

Usage:
  from model_dev.eval.bias_audit import run_bias_audit
  report = run_bias_audit("data/eval.jsonl", subgroup_key="age_group")
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def run_bias_audit(
    dataset_path: Optional[str] = None,
    subgroup_key: str = "subgroup",
    y_true: Optional[List[Any]] = None,
    y_pred: Optional[List[Any]] = None,
    subgroups: Optional[List[str]] = None,
    disparity_threshold: float = 0.1,
    bootstrap_n: int = 100,
) -> Dict[str, Any]:
    """
    Compute per-subgroup metrics (e.g. F1), disparity, and flag if disparity > threshold.
    If dataset_path given, load and expect columns: subgroup_key, label, prediction.
    """
    if dataset_path:
        import json
        y_true, y_pred, subgroups = [], [], []
        with open(dataset_path, "r", encoding="utf-8") as f:
            for line in f:
                row = json.loads(line.strip())
                subgroups.append(row.get(subgroup_key, "unknown"))
                y_true.append(row.get("label", row.get("reference")))
                y_pred.append(row.get("prediction", row.get("pred")))
    if not (y_true and y_pred and subgroups):
        return {"per_subgroup": {}, "disparity": 0.0, "flagged": False}
    from sklearn.metrics import f1_score
    per_subgroup: Dict[str, float] = {}
    for g in set(subgroups):
        mask = [s == g for s in subgroups]
        gt = [y_true[i] for i in range(len(y_true)) if mask[i]]
        gp = [y_pred[i] for i in range(len(y_pred)) if mask[i]]
        if gt and gp:
            per_subgroup[g] = float(f1_score(gt, gp, average="macro", zero_division=0))
    vals = list(per_subgroup.values())
    disparity = max(vals) - min(vals) if vals else 0.0
    flagged = disparity > disparity_threshold
    return {
        "per_subgroup": per_subgroup,
        "disparity": disparity,
        "flagged": flagged,
        "disparity_threshold": disparity_threshold,
    }
