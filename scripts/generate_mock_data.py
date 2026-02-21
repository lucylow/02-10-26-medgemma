#!/usr/bin/env python3
"""
Generate mock_data/cases/*.json, mock_data/index.json, and SVG thumbnails.
Deterministic (seed param). Produces 40+ cases including 10 Spanish, edge cases,
explainability, nearest_neighbors, data_quality, and provenance.
Run: python scripts/generate_mock_data.py   or: yarn gen:mock (if wired to Python)
"""
from __future__ import annotations

import argparse
import base64
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

OUT = Path(__file__).resolve().parent.parent / "mock_data"
CASES = OUT / "cases"
THUMBS = OUT / "thumbnails"
SCHEMA_VERSION = "1.0"
MOCK_DATA_VERSION = "1.0"


def make_embedding(dim: int = 256, rng: np.random.Generator | None = None) -> str:
    rng = rng or np.random.default_rng()
    v = rng.standard_normal(size=(dim,)).astype(np.float32)
    v = v / np.linalg.norm(v)
    return base64.b64encode(v.tobytes()).decode("ascii")


def write_svg_thumb(path: Path, label: str, case_num: int) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    svg = f'''<svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
  <rect rx="12" ry="12" width="100%" height="100%" fill="#F8F9FA"/>
  <circle cx="80" cy="80" r="40" fill="#E0F7FA"/>
  <text x="160" y="200" font-size="20" text-anchor="middle" fill="#5F6368">{label}</text>
</svg>'''
    path.write_text(svg)
    return str(path.relative_to(OUT))


# Caregiver texts and Spanish equivalents
TEXTS_EN = [
    "He says 'mama' sometimes but doesn't use two-word phrases. Points to objects.",
    "Runs and climbs well, still wobbly on one foot.",
    "Uses spoon, sometimes fork; spills often.",
    "Plays alongside others, minimal sharing.",
    "Limited eye contact, repetitive play.",
    "Parent concerned about speech.",
    "Points to things, seems social.",
    "He says 8 words and points, but no two-word phrases.",
]

TEXTS_ES = [
    "No dice palabras de dos palabras, solo balbucea.",
    "Corre y trepa bien, aún inestable en un pie.",
    "Usa cuchara, a veces tenedor; derrama a veces.",
    "Juega junto a otros, comparte poco.",
    "Contacto visual limitado, juego repetitivo.",
    "Padre preocupado por el habla.",
    "Señala cosas, parece sociable.",
    "Dice unas 8 palabras, no frases de dos palabras.",
]

RISKS = ["on_track", "monitor", "refer"]
AGES = [6, 12, 18, 24, 36, 48]
LOCALES = ["en-US", "es-ES"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate mock cases and thumbnails")
    parser.add_argument("--seed", type=int, default=1234, help="RNG seed")
    parser.add_argument("--count", type=int, default=40, help="Number of main cases")
    parser.add_argument("--out", type=str, default=None, help="Output dir (default: mock_data)")
    args = parser.parse_args()
    if args.out:
        global OUT, CASES, THUMBS
        OUT = Path(args.out)
        CASES = OUT / "cases"
        THUMBS = OUT / "thumbnails"

    CASES.mkdir(parents=True, exist_ok=True)
    THUMBS.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(args.seed)
    cases_index = []

    for i in range(1, args.count + 1):
        cid = f"case-{i:04d}"
        age = int(rng.choice(AGES))
        is_spanish = i <= 10
        locale = "es-ES" if is_spanish else "en-US"
        texts = TEXTS_ES if is_spanish else TEXTS_EN
        caregiver_text = texts[i % len(texts)]

        # Risk distribution: more on_track, fewer refer
        risk = rng.choice(RISKS, p=[0.5, 0.35, 0.15])
        conf = float(np.round(rng.uniform(0.5, 0.95), 2))
        low_confidence = conf < 0.55
        if low_confidence:
            uncertainty_reason = "Limited caregiver description; consider follow-up questions."
        else:
            uncertainty_reason = None

        emb = make_embedding(256, rng)
        thumb_name = f"thumb_{i:04d}.svg"
        thumb_rel = write_svg_thumb(THUMBS / thumb_name, f"case {i}", i)

        explainability = [
            {"type": "text", "detail": "10 words reported; no two-word phrases", "score": 0.6 + rng.uniform(0, 0.3)},
        ]
        if i % 3 == 0:
            explainability.append({
                "type": "image_region",
                "detail": f"grip pattern consistent with {age}-month drawing",
                "score": 0.5 + rng.uniform(0, 0.2),
            })
        if i % 5 == 0:
            explainability.append({
                "type": "nearest_neighbor",
                "detail": "Similar to cases in training set",
                "score": 0.7,
            })

        # Nearest neighbors for a subset (FAISS-style UI)
        nearest_neighbors = []
        if i % 4 == 0:
            for j in range(1, 4):
                other = ((i + j * 7) % args.count) + 1
                if other != i:
                    nearest_neighbors.append({
                        "case_id": f"case-{other:04d}",
                        "similarity": round(0.7 + rng.uniform(0, 0.2), 2),
                        "thumbnail": f"thumbnails/thumb_{other:04d}.svg",
                    })

        mock_inference = {
            "summary": [f"Mock summary for {cid}" + (" (es)" if is_spanish else "")],
            "risk": risk,
            "recommendations": [
                "Daily language modeling activities (5–10 mins)",
                "Re-screen in 3 months",
                "Consider referral if not improving",
            ][: 2 + (risk == "refer")],
            "parent_text": (
                "Su hijo podría beneficiarse de actividades de lenguaje diarias. Revisar en 3 meses."
                if is_spanish
                else "Your child may benefit from short daily language activities. Re-screen in 3 months."
            ),
            "explainability": explainability,
            "confidence": conf,
            "adapter_id": "mock/pediscreen_v1",
            "model_id": "google/medgemma-2b-it",
        }
        if uncertainty_reason:
            mock_inference["uncertainty_reason"] = uncertainty_reason
        if nearest_neighbors:
            mock_inference["nearest_neighbors"] = nearest_neighbors

        data_quality = rng.choice(
            [["ehr_verified"], ["clinician_reviewed"], ["small_n_pilot"], ["synthetic"]],
            p=[0.2, 0.3, 0.2, 0.3],
        ).tolist()
        provenance = {
            "source": "demo" if "synthetic" in data_quality else "pilot",
            "origin": "siteA",
            "collected_by": "CHW_001",
        }

        case = {
            "schema_version": SCHEMA_VERSION,
            "case_id": cid,
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "consent_id": "consent-demo",
            "age_months": age,
            "locale": locale,
            "caregiver_text": caregiver_text,
            "images": [thumb_rel],
            "embedding_b64": emb,
            "emb_version": "medsiglip-v1",
            "mock_inference": mock_inference,
            "audit_log": [],
            "data_quality": data_quality,
            "provenance": provenance,
        }
        (CASES / f"{cid}.json").write_text(json.dumps(case, indent=2))

        cases_index.append({
            "case_id": cid,
            "age_months": age,
            "locale": locale,
            "risk": risk,
            "thumb": thumb_rel,
        })

    (OUT / "index.json").write_text(json.dumps(cases_index, indent=2))
    (OUT / "MOCK_DATA_VERSION.txt").write_text(MOCK_DATA_VERSION + "\n")
    print(f"Wrote {args.count} cases to {CASES}, index and thumbnails to {OUT}")


if __name__ == "__main__":
    main()
