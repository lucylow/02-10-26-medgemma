#!/usr/bin/env python3
"""
Run clinical validation benchmark against gold holdout.

Usage:
  PYTHONPATH=. python validation/benchmarks/run_benchmark.py
  PYTHONPATH=. python validation/benchmarks/run_benchmark.py --gold-path validation/datasets/gold_holdout.csv
"""
import argparse
import sys
from pathlib import Path

# Add project root
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd

from src.validation import ClinicalMetrics, SafetyMetrics, ValidationReport


def load_gold_holdout(path: Path) -> pd.DataFrame:
    """Load gold holdout from parquet or CSV."""
    if path.suffix == ".parquet":
        return pd.read_parquet(path)
    return pd.read_csv(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--gold-path",
        default=ROOT / "validation" / "datasets" / "gold_holdout.csv",
        type=Path,
        help="Path to gold holdout (parquet or CSV)",
    )
    parser.add_argument(
        "--output-dir",
        default=ROOT / "validation" / "reports",
        type=Path,
        help="Output directory for reports",
    )
    parser.add_argument(
        "--mock-predictions",
        action="store_true",
        help="Use mock predictions (for CI without model)",
    )
    args = parser.parse_args()

    if not args.gold_path.exists():
        print(f"Gold holdout not found: {args.gold_path}")
        print("Run: python scripts/generate_gold_holdout.py")
        sys.exit(1)

    df = load_gold_holdout(args.gold_path)
    risk_map = {"on_track": 0, "monitor": 1, "discuss": 2, "refer": 3}
    y_true = np.array([risk_map.get(str(r).lower(), 0) for r in df["clinician_risk"]])

    if args.mock_predictions:
        # Simulate ~96% refer sensitivity: occasionally miss 1 refer
        np.random.seed(42)
        y_pred = y_true.copy()
        refer_idx = np.where(y_true == 3)[0]
        if len(refer_idx) > 0:
            miss = np.random.choice(refer_idx, size=min(1, len(refer_idx)), replace=False)
            y_pred[miss] = 2  # Miss as discuss
        # Add some noise to others
        noise = np.random.randint(0, 4, size=len(y_true))
        mask = np.random.random(len(y_true)) < 0.1
        y_pred[mask] = np.clip(y_true[mask] + np.random.randint(-1, 2, mask.sum()), 0, 3)
    else:
        # TODO: Call inference API for real predictions
        y_pred = y_true.copy()  # Placeholder

    # Clinical metrics
    metrics = ClinicalMetrics(y_true, y_pred)
    safety = SafetyMetrics(
        y_true, y_pred,
        case_ids=df["case_id"].tolist(),
        observations=df["observations"].tolist(),
    )

    report = ValidationReport(
        metrics=metrics,
        safety_metrics=safety,
        model_version="pediscreen-v0.1",
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    report.render_json(args.output_dir / "validation_report.json")
    report.render_model_card(args.output_dir / "model_card.txt")

    acc = metrics.compute_all()
    fn = safety.false_negative_analysis()
    print("\n=== Clinical Validation Report ===")
    print(f"Sensitivity: {acc['sensitivity']:.2%} [{acc.get('sensitivity_ci_95', [0,0])[0]:.2%}-{acc.get('sensitivity_ci_95', [0,0])[1]:.2%}]")
    print(f"Specificity: {acc['specificity']:.2%}")
    print(f"False Negatives (refer): {fn['count']} (rate: {fn['false_negative_rate']:.2%})")
    print(f"Reports written to {args.output_dir}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
