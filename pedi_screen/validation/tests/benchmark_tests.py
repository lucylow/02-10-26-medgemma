"""
Benchmark tests — sensitivity, specificity, PPV, NPV.
Ablation: text-only, image-only, multimodal.
Supports binary (0/1) and multi-class risk (low/monitor/elevated/discuss).
"""
import json
import os
from typing import Any, Dict, List, Optional, Tuple, Union

# Risk levels: concern = elevated/discuss/refer; normal = low/on_track
CONCERN_RISKS = frozenset({"elevated", "discuss", "refer", "high"})
NORMAL_RISKS = frozenset({"low", "on_track"})


def run_benchmark_tests(
    data_path: Optional[str] = None,
    modalities: Optional[List[str]] = None,
    use_multiclass: bool = True,
) -> Dict[str, Any]:
    """
    Run benchmark evaluation on labelled test set.
    Returns metrics per modality: sensitivity, specificity, PPV, NPV.
    If use_multiclass: expects gold_labels and predictions as risk strings.
    Otherwise: expects binary labels (0/1) and predictions (legacy).
    """
    modalities = modalities or ["text", "image", "multimodal"]
    results: Dict[str, Any] = {}

    # Load test data (supports both gold_standard format and legacy benchmark.json)
    gold_labels, predictions, is_multiclass = _load_test_data(data_path, use_multiclass)

    for mod in modalities:
        if gold_labels and predictions:
            preds = predictions.get(mod, [])
            if is_multiclass:
                tp, tn, fp, fn, cm = _compute_confusion_multiclass(gold_labels, preds)
                sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
                spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
                ppv = tp / (tp + fp) if (tp + fp) > 0 else 0.0
                npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0
                results[mod] = {
                    "sensitivity": round(sens, 4),
                    "specificity": round(spec, 4),
                    "ppv": round(ppv, 4),
                    "npv": round(npv, 4),
                    "n": len(gold_labels),
                    "confusion_matrix": cm,
                }
            else:
                tp, tn, fp, fn = _compute_confusion_binary(gold_labels, preds)
                sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
                spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
                ppv = tp / (tp + fp) if (tp + fp) > 0 else 0.0
                npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0
                results[mod] = {
                    "sensitivity": round(sens, 4),
                    "specificity": round(spec, 4),
                    "ppv": round(ppv, 4),
                    "npv": round(npv, 4),
                    "n": len(gold_labels),
                }
        else:
            results[mod] = {
                "sensitivity": 0.0,
                "specificity": 0.0,
                "ppv": 0.0,
                "npv": 0.0,
                "n": 0,
                "note": "No labelled test data; add data/validation_set/benchmark.json or gold_standard.json",
            }

    return results


def _load_test_data(
    data_path: Optional[str], use_multiclass: bool
) -> Tuple[List[Union[int, str]], Dict[str, List[Union[int, str]]], bool]:
    """Load labels and predictions. Prefer gold_standard.json if present."""
    if not data_path:
        return [], {}, False

    # Try gold_standard format first
    gs_path = os.path.join(data_path, "gold_standard.json")
    if os.path.isfile(gs_path) and use_multiclass:
        try:
            with open(gs_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            cases = data.get("cases", [])
            pred_data = data.get("predictions", {})
            if cases and pred_data:
                labels = [
                    _extract_risk(c.get("clinician_label", {}))
                    for c in cases
                ]
                preds: Dict[str, List[Union[int, str]]] = {}
                if isinstance(pred_data, dict) and pred_data:
                    first_key = next(iter(pred_data))
                    first_val = pred_data[first_key]
                    if isinstance(first_val, list) and len(first_val) == len(labels):
                        for mod, arr in pred_data.items():
                            preds[mod] = [_extract_risk(x) for x in arr]
                elif isinstance(pred_data, list) and pred_data and len(pred_data) == len(labels):
                    first = pred_data[0]
                    for k in first:
                        preds[k] = [_extract_risk(p.get(k)) for p in pred_data]
                if preds:
                    return labels, preds, True
        except Exception:
            pass

    # Legacy benchmark.json
    path = os.path.join(data_path, "benchmark.json")
    if not os.path.isfile(path):
        return [], {}, False
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        labels = data.get("labels", [])
        predictions = data.get("predictions", {})
        return labels, predictions, False
    except Exception:
        return [], {}, False


def _extract_risk(obj: Any) -> str:
    """Extract risk string from clinician_label or prediction dict."""
    if obj is None:
        return "monitor"
    if isinstance(obj, str):
        return obj.lower().strip()
    risk = obj.get("risk") or obj.get("risk_level") or obj.get("riskLevel")
    if risk:
        return str(risk).lower().strip()
    return "monitor"


def _is_concern(risk: Union[int, str]) -> bool:
    """True if risk indicates developmental concern (elevated/discuss/refer)."""
    if isinstance(risk, int):
        return risk == 1
    return str(risk).lower() in CONCERN_RISKS


def _compute_confusion_binary(
    labels: List[int], predictions: List[int]
) -> Tuple[int, int, int, int]:
    """Compute TP, TN, FP, FN. Binary: 1=positive, 0=negative."""
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


def _compute_confusion_multiclass(
    gold_labels: List[str], predictions: List[str]
) -> Tuple[int, int, int, int, List[List[int]]]:
    """
    Binary view: concern (elevated/discuss/refer) vs normal (low/on_track).
    Returns (TP, TN, FP, FN) and confusion matrix for multi-class.
    """
    from sklearn.metrics import confusion_matrix as sk_confusion

    gold_bin = [1 if _is_concern(g) else 0 for g in gold_labels]
    pred_bin = [1 if _is_concern(p) else 0 for p in predictions[: len(gold_labels)]]
    tp = sum(1 for g, p in zip(gold_bin, pred_bin) if g == 1 and p == 1)
    tn = sum(1 for g, p in zip(gold_bin, pred_bin) if g == 0 and p == 0)
    fp = sum(1 for g, p in zip(gold_bin, pred_bin) if g == 0 and p == 1)
    fn = sum(1 for g, p in zip(gold_bin, pred_bin) if g == 1 and p == 0)

    # Multi-class confusion matrix (if we have consistent labels)
    try:
        cm = sk_confusion(gold_labels, predictions[: len(gold_labels)])
        cm_list = cm.tolist() if hasattr(cm, "tolist") else cm
    except Exception:
        cm_list = []
    return tp, tn, fp, fn, cm_list
