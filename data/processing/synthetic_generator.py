#!/usr/bin/env python3
"""
PediScreen AI - CDC-Grounded Synthetic Data Generator

Generates synthetic pediatric developmental screening records grounded in:
- CDC Developmental Milestones (ground truth)
- ASQ-3-style structured constraints
- Target risk stratification (on_track, monitor, discuss, refer)

Usage:
    python -m data.processing.synthetic_generator --n 10000 --output data/synthetic/v1.0
    python -m data.processing.synthetic_generator --n 1000 --benchmark  # Also emit benchmark.json format

Output:
    - train.parquet: Full synthetic training set
    - benchmark.json: Subset for validation (labels + placeholder predictions)
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import numpy as np
import pandas as pd

# Paths relative to project root
PROJECT_ROOT = Path(__file__).resolve().parents[2]
CDC_PATH = PROJECT_ROOT / "data" / "public" / "cdc_milestones.parquet"
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "synthetic" / "v1.0"

RISK_LEVELS: tuple[str, ...] = ("on_track", "monitor", "discuss", "refer")
DOMAINS: tuple[str, ...] = (
    "communication",
    "gross_motor",
    "fine_motor",
    "social",
    "cognitive",
)

# CDC 50th percentile reference (24mo communication example)
# Used for constraint-based generation when CDC parquet unavailable
CDC_FALLBACK_24MO_COMM: Dict[str, Any] = {
    "vocab_words": (10, 100),  # CDC 50th ~50 words
    "word_combos": 0.5,  # Bernoulli: emerging 2-word phrases
    "follows_directions": 0.6,  # 2-step
}

# Target risk distribution: on_track, monitor, discuss, refer
DEFAULT_RISK_DIST: List[float] = [0.3, 0.4, 0.2, 0.1]

# Observation templates by risk (domain-agnostic starters)
OBSERVATION_TEMPLATES: Dict[str, List[str]] = {
    "on_track": [
        "Child uses many words and short phrases.",
        "Plays well with others, shares toys sometimes.",
        "Walks steadily, runs, climbs on playground equipment.",
        "Builds towers of blocks, scribbles with crayon.",
        "Follows simple directions, points to body parts.",
    ],
    "monitor": [
        "Uses some words but fewer than other children same age.",
        "Sometimes avoids eye contact during play.",
        "Climbs stairs with help, still working on balance.",
        "Limited interest in drawing or stacking.",
        "Occasionally responds to name.",
    ],
    "discuss": [
        "Limited words, mostly gestures at this age.",
        "Rarely points to show things of interest.",
        "Difficulty with fine motor tasks like stacking blocks.",
        "Prefers solitary play, limited social engagement.",
        "Inconsistent response to simple directions.",
    ],
    "refer": [
        "No words yet, only sounds.",
        "Does not respond to name consistently.",
        "Loss of previously acquired skills.",
        "Minimal eye contact, limited social reciprocity.",
        "Significant delay across multiple domains.",
    ],
}


def _ensure_cdc_milestones() -> pd.DataFrame:
    """Load CDC milestones; create fallback if missing."""
    if CDC_PATH.exists():
        return pd.read_parquet(CDC_PATH)
    # Fallback: minimal inline milestones (run download_public.py for full set)
    rows = [
        {"age_months": 24, "domain": "communication", "description": "says 50 words", "percentile": 0.75},
        {"age_months": 24, "domain": "communication", "description": "uses two-word phrases", "percentile": 0.50},
        {"age_months": 24, "domain": "gross_motor", "description": "runs", "percentile": 0.85},
        {"age_months": 24, "domain": "fine_motor", "description": "builds tower of 4 blocks", "percentile": 0.65},
        {"age_months": 24, "domain": "social", "description": "notices other children", "percentile": 0.80},
        {"age_months": 18, "domain": "communication", "description": "says several single words", "percentile": 0.75},
        {"age_months": 36, "domain": "communication", "description": "talks in 2-3 word sentences", "percentile": 0.70},
    ]
    return pd.DataFrame(rows)


def _generate_observation(
    risk: str,
    age: int,
    domain: str,
    milestones: pd.DataFrame,
    rng: np.random.Generator,
) -> str:
    """Generate plausible caregiver observation text grounded in CDC milestones."""
    subset = milestones[
        (milestones["age_months"] == age) & (milestones["domain"] == domain)
    ]
    if subset.empty:
        subset = milestones[(milestones["age_months"] == age) | (milestones["domain"] == domain)]
    if subset.empty:
        subset = milestones

    templates = OBSERVATION_TEMPLATES.get(risk, OBSERVATION_TEMPLATES["on_track"])
    base = templates[rng.integers(0, len(templates))]

    if not subset.empty and risk != "on_track":
        milestone = subset.sample(random_state=rng.integers(0, 2**31)).iloc[0]
        desc = milestone["description"]
        if risk == "refer":
            base = f"Does not {desc} yet. {base}"
        elif risk == "discuss":
            base = f"Limited progress with {desc}. {base}"

    return f"At {age} months: {base}"


def _generate_scores(domain: str, risk: str, rng: np.random.Generator) -> Dict[str, float]:
    """Generate structured scores aligned with risk level."""
    base = {"on_track": 0.85, "monitor": 0.65, "discuss": 0.45, "refer": 0.25}[risk]
    noise = rng.uniform(-0.1, 0.1, 5)
    return {
        f"{domain}_score_{i}": float(np.clip(base + noise[i], 0, 1))
        for i in range(5)
    }


def generate_batch(
    n: int = 10000,
    risk_dist: Optional[List[float]] = None,
    ages: Optional[List[int]] = None,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate n synthetic screening records.

    Args:
        n: Number of records
        risk_dist: [on_track, monitor, discuss, refer] probabilities
        ages: Age months to sample from (default: 18, 24, 36, 48, 60)
        seed: Random seed for reproducibility

    Returns:
        DataFrame with columns: record_id, age_months, domain, observations,
        clinician_risk, structured_scores, generator_version, clinician_reviewed
    """
    risk_dist = risk_dist or DEFAULT_RISK_DIST
    ages = ages or [18, 24, 36, 48, 60]
    age_probs = [0.2, 0.3, 0.3, 0.15, 0.05][: len(ages)]
    if len(age_probs) < len(ages):
        age_probs = [1.0 / len(ages)] * len(ages)

    milestones = _ensure_cdc_milestones()
    rng = np.random.default_rng(seed)

    records: List[Dict[str, Any]] = []
    for i in range(n):
        age = int(rng.choice(ages, p=age_probs))
        domain = str(rng.choice(list(DOMAINS)))
        risk = str(rng.choice(list(RISK_LEVELS), p=risk_dist))

        obs = _generate_observation(risk, age, domain, milestones, rng)
        scores = _generate_scores(domain, risk, rng)

        records.append({
            "record_id": f"synth_{i:06d}",
            "age_months": age,
            "domain": domain,
            "observations": obs,
            "clinician_risk": risk,
            "structured_scores": json.dumps(scores),  # JSON string for parquet compatibility
            "generator_version": "cdc_grounded_v1.0",
            "clinician_reviewed": False,
        })

    return pd.DataFrame(records)


def to_benchmark_format(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Convert synthetic DataFrame to benchmark.json format.

    Labels: 1 = refer/discuss (positive), 0 = on_track/monitor (negative)
    Predictions: Placeholder (all 0) for CI; replace with model outputs for real eval.
    """
    risk_to_binary = {"on_track": 0, "monitor": 0, "discuss": 1, "refer": 1}
    labels = [risk_to_binary.get(r, 0) for r in df["clinician_risk"]]
    n = len(labels)
    return {
        "labels": labels,
        "predictions": {
            "text": [0] * n,
            "image": [0] * n,
            "multimodal": [0] * n,
        },
        "meta": {
            "source": "synthetic_cdc_grounded",
            "n": n,
            "generator_version": "cdc_grounded_v1.0",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate CDC-grounded synthetic pediatric screening data"
    )
    parser.add_argument(
        "--n",
        type=int,
        default=10000,
        help="Number of records to generate (default: 10000)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Output directory for train.parquet",
    )
    parser.add_argument(
        "--benchmark",
        action="store_true",
        help="Also write benchmark subset to validation_set",
    )
    parser.add_argument(
        "--benchmark-n",
        type=int,
        default=500,
        help="Number of records for benchmark subset (default: 500)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed (default: 42)",
    )
    args = parser.parse_args()

    df = generate_batch(n=args.n, seed=args.seed)
    args.output.mkdir(parents=True, exist_ok=True)
    train_path = args.output / "train.parquet"
    df.to_parquet(train_path, index=False)
    print(f"Generated {len(df)} records -> {train_path}")

    if args.benchmark:
        subset = df.sample(n=min(args.benchmark_n, len(df)), random_state=args.seed)
        bench = to_benchmark_format(subset)
        val_dir = PROJECT_ROOT / "data" / "validation_set"
        val_dir.mkdir(parents=True, exist_ok=True)
        bench_path = val_dir / "benchmark_synthetic.json"
        with open(bench_path, "w", encoding="utf-8") as f:
            json.dump(bench, f, indent=2)
        print(f"Benchmark subset ({len(subset)} cases) -> {bench_path}")


if __name__ == "__main__":
    main()
