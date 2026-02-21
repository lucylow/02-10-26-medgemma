"""
Evaluation runner: run mock cases, compute risk distribution, confidence, fallback %, latency.
Output: evaluation_report.json (PAGE 14).
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time
from pathlib import Path

# Add backend to path when run from repo root
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_mock_cases(path: str):
    """Load JSONL or list of dicts."""
    p = Path(path)
    if not p.exists():
        return []
    out = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return out


def run_evaluation(
    cases_path: str = "data/test_cases.jsonl",
    output_path: str = "backend/evaluation/evaluation_report.json",
    use_controller: bool = True,
):
    """
    Run all mock cases through inference; compute metrics.
    Set use_controller=False to use model only (no MCP).
    """
    cases = load_mock_cases(cases_path)
    if not cases:
        logger.warning("No cases at %s; using 3 synthetic cases", cases_path)
        cases = [
            {"case_id": "eval-1", "age_months": 24, "observations": "Says 10 words.", "expected_risk": "monitor"},
            {"case_id": "eval-2", "age_months": 36, "observations": "Speaks in sentences.", "expected_risk": "low"},
            {"case_id": "eval-3", "age_months": 18, "observations": "No words yet.", "expected_risk": "refer"},
        ]
    os.environ.setdefault("MODEL_BACKEND", "mock")
    from app.services.inference_controller import run_inference_sync
    from app.models.embedding_model import MockEmbeddingModel
    emb_model = MockEmbeddingModel()
    results = []
    latencies = []
    fallback_count = 0
    risk_counts = {}
    confidence_sum = 0.0
    for c in cases:
        case_id = c.get("case_id", "unknown")
        age = c.get("age_months", 24)
        obs = c.get("observations", "")
        emb_out = emb_model.infer({"case_id": case_id, "observations": obs})
        emb_b64 = emb_out["embedding_b64"]
        shape = emb_out["shape"]
        t0 = time.perf_counter()
        out = run_inference_sync(
            case_id=case_id,
            age_months=age,
            observations=obs,
            embedding_b64=emb_b64,
            shape=shape,
            request_id="eval",
        )
        latencies.append(time.perf_counter() - t0)
        results.append({"case_id": case_id, "risk": out.get("risk"), "confidence": out.get("confidence"), "fallback": out.get("fallback")})
        if out.get("fallback"):
            fallback_count += 1
        r = out.get("risk", "monitor")
        risk_counts[r] = risk_counts.get(r, 0) + 1
        confidence_sum += out.get("confidence", 0.5)
    n = len(results)
    report = {
        "total_cases": n,
        "risk_distribution": risk_counts,
        "average_confidence": confidence_sum / n if n else 0,
        "fallback_triggered_pct": round(100.0 * fallback_count / n, 2) if n else 0,
        "latency_seconds": {
            "min": round(min(latencies), 3) if latencies else 0,
            "max": round(max(latencies), 3) if latencies else 0,
            "avg": round(sum(latencies) / len(latencies), 3) if latencies else 0,
        },
        "results_sample": results[:10],
    }
    out_dir = Path(output_path).parent
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info("Report written to %s", output_path)
    return report


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", default="data/test_cases.jsonl")
    ap.add_argument("--output", default="backend/evaluation/evaluation_report.json")
    args = ap.parse_args()
    run_evaluation(cases_path=args.cases, output_path=args.output)
