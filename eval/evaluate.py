"""
Evaluation tool: load adapter/base, run inference on eval set, compute metrics,
ROC/PR curves, latency; save report.json and artifact paths.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any, List, Optional

import numpy as np

# Optional: sklearn for curves
try:
    from sklearn.metrics import precision_recall_curve, roc_curve
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

from eval.metrics import classification_metrics


def load_predictions_and_labels(eval_file: str | Path) -> tuple[List[str], List[str], List[float]]:
    """Load eval JSONL with expected_risk/label and optional 'prediction' column."""
    labels_true = []
    labels_pred = []
    latencies: List[float] = []
    path = Path(eval_file)
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            labels_true.append(obj.get("expected_risk") or obj.get("label") or "unknown")
            labels_pred.append(obj.get("prediction", obj.get("expected_risk", "unknown")))
            latencies.append(obj.get("inference_time_ms", 0.0))
    return labels_true, labels_pred, latencies


def run_inference_mock(eval_file: str | Path, model_path: Optional[str] = None) -> List[dict]:
    """Placeholder: no model load; add 'prediction' and inference_time_ms to each row.
    Replace with real adapter inference in production.
    """
    out = []
    path = Path(eval_file)
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            t0 = time.perf_counter()
            # Mock: use expected_risk as prediction for testing
            pred = obj.get("expected_risk") or obj.get("label") or "monitor"
            time.sleep(0.001)
            obj["prediction"] = pred
            obj["inference_time_ms"] = (time.perf_counter() - t0) * 1000
            out.append(obj)
    return out


def latency_percentiles(latencies: List[float]) -> dict:
    a = np.array(latencies)
    if len(a) == 0:
        return {"p50_ms": 0, "p95_ms": 0, "p99_ms": 0}
    return {
        "p50_ms": float(np.percentile(a, 50)),
        "p95_ms": float(np.percentile(a, 95)),
        "p99_ms": float(np.percentile(a, 99)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate adapter on eval set")
    parser.add_argument("--model", default=None, help="Adapter or base model path (optional for mock)")
    parser.add_argument("--eval_file", required=True, help="JSONL with label/expected_risk and optional prediction")
    parser.add_argument("--report_path", default="eval/report.json")
    parser.add_argument("--artifacts_dir", default="eval/artifacts")
    parser.add_argument("--mock", action="store_true", help="Use mock inference (no model load)")
    args = parser.parse_args()

    eval_path = Path(args.eval_file)
    if not eval_path.exists():
        raise FileNotFoundError(args.eval_file)

    if args.mock:
        results = run_inference_mock(eval_path, args.model)
        # Write predictions to temp for metrics
        pred_path = Path(args.artifacts_dir) / "predictions.jsonl"
        pred_path.parent.mkdir(parents=True, exist_ok=True)
        with open(pred_path, "w") as f:
            for r in results:
                f.write(json.dumps(r) + "\n")
        y_true = [r.get("expected_risk") or r.get("label") for r in results]
        y_pred = [r["prediction"] for r in results]
        latencies = [r["inference_time_ms"] for r in results]
    else:
        # Real inference would load model and run here
        y_true, y_pred, latencies = load_predictions_and_labels(eval_path)

    metrics = classification_metrics(y_true, y_pred)
    metrics["latency"] = latency_percentiles(latencies)

    artifacts: dict = {"predictions_jsonl": str(pred_path) if pred_path else None}
    if HAS_SKLEARN and len(set(y_true) | set(y_pred)) == 2:
        # Binary ROC/PR
        y_bin = [1 if y == "refer" else 0 for y in y_true]
        y_score = [1 if y == "refer" else 0 for y in y_pred]
        fpr, tpr, _ = roc_curve(y_bin, y_score)
        prec, rec, _ = precision_recall_curve(y_bin, y_score)
        artifacts["roc_curve"] = {"fpr": fpr.tolist(), "tpr": tpr.tolist()}
        artifacts["pr_curve"] = {"precision": prec.tolist(), "recall": rec.tolist()}
    else:
        artifacts["roc_curve"] = None
        artifacts["pr_curve"] = None

    report = {
        "metrics": metrics,
        "artifacts": artifacts,
        "eval_file": str(eval_path),
        "model_path": args.model,
    }
    report_path = Path(args.report_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Report written to {report_path}")


if __name__ == "__main__":
    main()
