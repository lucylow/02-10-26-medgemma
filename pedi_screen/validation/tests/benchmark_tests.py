"""
Benchmark tests — sensitivity, specificity, PPV, NPV.
Ablation: text-only, image-only, multimodal.
"""
import json
import os
from typing import Any, Dict, List, Optional


def run_benchmark_tests(
    data_path: Optional[str] = None,
    modalities: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Run benchmark evaluation on labelled test set.
    Returns metrics per modality: sensitivity, specificity, PPV, NPV.
    """
    modalities = modalities or ["text", "image", "multimodal"]
    results: Dict[str, Any] = {}

    # Load labelled test set if available
    labels, predictions = _load_test_data(data_path)

    for mod in modalities:
        if labels and predictions:
            tp, tn, fp, fn = _compute_confusion(labels, predictions.get(mod, []))
            sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
            ppv = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0
            results[mod] = {
                "sensitivity": round(sens, 4),
                "specificity": round(spec, 4),
                "ppv": round(ppv, 4),
                "npv": round(npv, 4),
                "n": len(labels),
            }
        else:
            # No test data: return placeholder for CI
            results[mod] = {
                "sensitivity": 0.0,
                "specificity": 0.0,
                "ppv": 0.0,
                "npv": 0.0,
                "n": 0,
                "note": "No labelled test data; add data/validation_set/benchmark.json",
            }

    return results


def _load_test_data(data_path: Optional[str]) -> tuple:
    """Load labels and predictions from benchmark.json."""
    if not data_path:
        return [], {}
    path = os.path.join(data_path, "benchmark.json")
    if not os.path.isfile(path):
        return [], {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        labels = data.get("labels", [])
        predictions = data.get("predictions", {})
        return labels, predictions
    except Exception:
        return [], {}


def _compute_confusion(labels: List[int], predictions: List[int]) -> tuple:
    """Compute TP, TN, FP, FN. Assume binary: 1=positive, 0=negative."""
    tp = tn = fp = fn = 0
    for l, p in zip(labels, predictions[: len(labels)]):
        if l == 1 and p == 1:
            tp += 1
        elif l == 0 and p == 0:
            tn += 1
        elif l == 0 and p == 1:
            fp += 1
        else:
            fn += 1
    return tp, tn, fp, fn
