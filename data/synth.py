"""
Synthetic dataset generator for safe, reproducible experiments.

Produces JSONL with CaseRecord-shaped rows: varied ages, observations,
ASQ-like scores, optional simulated embeddings. No PHI.
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

# Allow running as python -m data.synth from repo root
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from data.schema import VALID_LABELS

SEED = 42
RISK_LEVELS = list(VALID_LABELS)
OBS_TEMPLATES = {
    "on_track": [
        "Child uses many words and short phrases. Plays well with others.",
        "Walks steadily, runs, climbs. Builds towers of blocks, scribbles with crayon.",
    ],
    "monitor": [
        "Uses some words but fewer than other children same age. Sometimes avoids eye contact.",
        "Climbs stairs with help, still working on balance. Limited interest in drawing.",
    ],
    "discuss": [
        "Limited words, mostly gestures at this age. Rarely points to show things.",
        "Difficulty with fine motor tasks. Prefers solitary play, limited social engagement.",
    ],
    "refer": [
        "No words yet, only sounds. Does not respond to name consistently.",
        "Loss of previously acquired skills. Minimal eye contact, limited reciprocity.",
    ],
}


def _random_asq_scores(rng: random.Random, risk: str) -> dict:
    base = {"vocab": 0.5, "syntax": 0.5, "receptive": 0.5}
    if risk == "on_track":
        return {k: round(rng.uniform(0.7, 0.95), 2) for k in base}
    if risk == "monitor":
        return {k: round(rng.uniform(0.4, 0.7), 2) for k in base}
    if risk == "discuss":
        return {k: round(rng.uniform(0.2, 0.5), 2) for k in base}
    return {k: round(rng.uniform(0.05, 0.25), 2) for k in base}


def _simulated_embedding(dim: int, rng: random.Random) -> list[float]:
    vec = [rng.gauss(0, 1) for _ in range(dim)]
    norm = (sum(x * x for x in vec)) ** 0.5
    return [round(x / norm, 6) for x in vec] if norm else [0.0] * dim


def generate_synthetic(
    n: int,
    seed: int = SEED,
    include_embedding: bool = False,
    embedding_dim: int = 256,
) -> list[dict]:
    """Generate n synthetic case records (reproducible with seed)."""
    rng = random.Random(seed)
    out = []
    for i in range(n):
        risk = rng.choice(RISK_LEVELS)
        age = rng.randint(6, 60)
        obs = rng.choice(OBS_TEMPLATES[risk])
        case_id = f"synth_{seed}_{i:05d}"
        rec = {
            "case_id": case_id,
            "age_months": age,
            "observations": obs,
            "asq_scores": _random_asq_scores(rng, risk),
            "label": risk,
            "expected_risk": risk,
        }
        if include_embedding:
            rec["embedding"] = _simulated_embedding(embedding_dim, rng)
        out.append(rec)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic PediScreen JSONL")
    parser.add_argument("--n", type=int, default=200, help="Number of cases")
    parser.add_argument("--out", default="data/synth_train.jsonl", help="Output JSONL path")
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--embedding", action="store_true", help="Add simulated embedding vector")
    parser.add_argument("--embedding-dim", type=int, default=256)
    args = parser.parse_args()

    records = generate_synthetic(
        args.n,
        seed=args.seed,
        include_embedding=args.embedding,
        embedding_dim=args.embedding_dim,
    )
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Wrote {len(records)} records to {out_path}")


if __name__ == "__main__":
    main()
