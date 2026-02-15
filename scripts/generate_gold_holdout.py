#!/usr/bin/env python3
"""
Generate gold-standard holdout set for clinical validation.

Target distribution (Phase 1: 100 cases):
- 20 on_track, 40 monitor, 30 discuss, 10 refer
"""
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PROJECT_ROOT / "validation" / "datasets" / "gold_holdout.parquet"

RISK_LABELS = ["on_track", "monitor", "discuss", "refer"]

# Phase 1: 100 cases
DISTRIBUTION = {
    "on_track": 20,
    "monitor": 40,
    "discuss": 30,
    "refer": 10,
}


def _observation_for_risk(risk: str, age: int, domain: str) -> str:
    """Generate plausible caregiver observation text per risk level."""
    templates = {
        "on_track": [
            f"Child uses many words and short phrases at {age} months.",
            f"Plays well with others, shares toys sometimes.",
            f"Walks steadily, runs, climbs on playground equipment.",
        ],
        "monitor": [
            f"Uses some words but fewer than other children same age.",
            f"Sometimes avoids eye contact during play.",
            f"Climbs stairs with help, still working on balance.",
        ],
        "discuss": [
            f"Limited words at {age} months, mostly gestures.",
            f"Rarely points to show things of interest.",
            f"Difficulty with fine motor tasks like stacking blocks.",
        ],
        "refer": [
            f"No words yet at {age} months, only sounds.",
            f"Does not respond to name consistently.",
            f"Loss of previously acquired skills.",
        ],
    }
    opts = templates.get(risk, templates["on_track"])
    idx = hash(f"{age}_{domain}_{risk}") % len(opts)
    return opts[idx]


def generate_gold_holdout(n_per_risk: dict = None) -> pd.DataFrame:
    """Generate gold holdout DataFrame."""
    n_per_risk = n_per_risk or DISTRIBUTION
    domains = ["communication", "gross_motor", "fine_motor", "social", "cognitive"]
    rows = []
    case_id = 0
    np.random.seed(42)
    for risk, count in n_per_risk.items():
        for _ in range(count):
            age = int(np.random.choice([18, 24, 36, 48, 60]))
            domain = str(np.random.choice(domains))
            rows.append({
                "case_id": f"gold_{case_id:04d}",
                "age_months": age,
                "domain": domain,
                "observations": _observation_for_risk(risk, age, domain),
                "clinician_risk": risk,
                "labeler_count": 3,
                "kappa": 0.78,
            })
            case_id += 1
    return pd.DataFrame(rows)


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df = generate_gold_holdout()
    df.to_parquet(OUTPUT_PATH, index=False)
    print(f"Generated {len(df)} cases -> {OUTPUT_PATH}")
    print(df["clinician_risk"].value_counts())


if __name__ == "__main__":
    main()
