"""
Eval pipeline orchestrator for model-dev: run metrics and write to artifacts/eval/{run_id}.

Purpose: Load adapter + dataset, run inference or load preds, compute metrics (incl. bias),
write report to artifacts/eval/{run_id}.
Inputs: --adapter_path, --dataset_path, --output_dir.
Outputs: Report JSON and optional HTML under artifacts/eval/.

Usage:
  python model-dev/eval/eval_pipeline.py --adapter_path model-dev/adapters/example_adapter --dataset_path data/eval.jsonl
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import uuid
from pathlib import Path

# Allow importing from model-dev/eval when run from repo root
_MODEL_DEV = Path(__file__).resolve().parents[1]
if str(_MODEL_DEV) not in sys.path:
    sys.path.insert(0, str(_MODEL_DEV))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter_path", default=None)
    parser.add_argument("--dataset_path", required=True)
    parser.add_argument("--output_dir", default=None)
    parser.add_argument("--subgroup_key", default=None, help="Column for bias audit (e.g. age_group, sex)")
    parser.add_argument("--disparity_threshold", type=float, default=0.1)
    args = parser.parse_args()
    run_id = str(uuid.uuid4())[:8]
    out_dir = Path(args.output_dir or f"model-dev/artifacts/eval/{run_id}")
    out_dir.mkdir(parents=True, exist_ok=True)
    # TODO: Load adapter, run inference or load preds, compute eval_metrics, run bias_audit if subgroup_key set
    report = {
        "run_id": run_id,
        "adapter_path": args.adapter_path,
        "dataset_path": args.dataset_path,
        "metrics": {},
        "bias_audit": None,
    }
    if args.subgroup_key:
        try:
            from eval.bias_audit import run_bias_audit
            report["bias_audit"] = run_bias_audit(args.dataset_path, subgroup_key=args.subgroup_key)
        except Exception as e:
            logger.warning("bias_audit failed: %s", e)
    out_path = out_dir / "report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info("Report written to %s", out_path)


if __name__ == "__main__":
    main()
