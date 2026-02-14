"""
Bias audit — demographic subgroup performance; equity metrics.
"""
import json
import os
from typing import Any, Dict, List, Optional


def run_bias_audit(data_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Run bias audit across demographic subgroups.
    Returns performance by subgroup (ethnicity, SES, language).
    """
    subgroups = _load_subgroup_data(data_path)
    results: Dict[str, Any] = {"subgroups": {}, "summary": {}}

    if not subgroups:
        results["note"] = "No subgroup data; add data/validation_set/bias_audit.json"
        return results

    for subgroup_name, items in subgroups.items():
        labels = [i.get("label", 0) for i in items]
        preds = [i.get("prediction", 0) for i in items]
        tp = sum(1 for l, p in zip(labels, preds) if l == 1 and p == 1)
        tn = sum(1 for l, p in zip(labels, preds) if l == 0 and p == 0)
        fp = sum(1 for l, p in zip(labels, preds) if l == 0 and p == 1)
        fn = sum(1 for l, p in zip(labels, preds) if l == 1 and p == 0)
        sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        results["subgroups"][subgroup_name] = {
            "sensitivity": round(sens, 4),
            "specificity": round(spec, 4),
            "n": len(items),
        }

    # Summary: max disparity
    sens_values = [s["sensitivity"] for s in results["subgroups"].values()]
    if sens_values:
        results["summary"]["sensitivity_disparity"] = round(
            max(sens_values) - min(sens_values), 4
        )
    return results


def _load_subgroup_data(data_path: Optional[str]) -> Dict[str, List[Dict]]:
    """Load bias_audit.json with subgroup labels and predictions."""
    if not data_path:
        return {}
    path = os.path.join(data_path, "bias_audit.json")
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}
