"""
PediScreen AI - Synthetic Developmental Screening Data Generator

Generates CDC-grounded synthetic caregiver observations for training MedGemma.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Literal

import numpy as np
import pandas as pd
from pydantic import BaseModel

# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
CDC_PATH = PROJECT_ROOT / "data" / "public" / "cdc_milestones.parquet"
OUTPUT_DIR = PROJECT_ROOT / "data" / "synthetic" / "v1.0"


class DevelopmentalMilestone(BaseModel):
    """Single developmental milestone from CDC guidelines."""

    age_months: int
    domain: Literal["communication", "gross_motor", "fine_motor", "social", "cognitive"]
    description: str
    percentile: float


class SyntheticScreening(BaseModel):
    """Single synthetic screening record."""

    record_id: str
    age_months: int
    domain: str
    caregiver_text: str
    structured_scores: Dict[str, float]
    visual_features: Dict[str, float]
    clinician_risk: Literal["on_track", "monitor", "discuss", "refer"]
    synthetic: bool = True


class SyntheticDataGenerator:
    """Generate realistic synthetic pediatric screening data."""

    def __init__(
        self,
        cdc_milestones_path: str | Path | None = None,
        cdc_milestones_df: pd.DataFrame | None = None,
    ):
        if cdc_milestones_df is not None:
            self.milestones = cdc_milestones_df
        else:
            path = Path(cdc_milestones_path or CDC_PATH)
            if not path.exists():
                raise FileNotFoundError(
                    f"CDC milestones not found at {path}. Run: make data-download"
                )
            self.milestones = pd.read_parquet(path)

    def _generate_scores(self, domain: str, risk: str) -> Dict[str, float]:
        """Generate structured scores aligned with risk level."""
        base = {"on_track": 0.85, "monitor": 0.65, "discuss": 0.45, "refer": 0.25}[risk]
        noise = np.random.uniform(-0.1, 0.1, 5)
        return {
            f"{domain}_score_{i}": float(np.clip(base + noise[i], 0, 1))
            for i in range(5)
        }

    def _generate_visual_features(self, age: int, domain: str) -> Dict[str, float]:
        """Generate placeholder visual feature embeddings."""
        np.random.seed(hash(f"{age}_{domain}") % 2**32)
        return {
            f"feat_{i}": float(np.random.uniform(-1, 1))
            for i in range(8)
        }

    def generate_caregiver_observation(self, age: int, domain: str) -> str:
        """Generate realistic parent descriptions from CDC milestones."""
        subset = self.milestones[
            (self.milestones["age_months"] == age)
            & (self.milestones["domain"] == domain)
        ]
        if subset.empty:
            subset = self.milestones[
                (self.milestones["age_months"] == age)
                | (self.milestones["domain"] == domain)
            ]
        if subset.empty:
            subset = self.milestones

        milestone = subset.sample(1).iloc[0]
        desc = milestone["description"]
        skill_level = np.random.beta(1.5, 1.5)

        if skill_level > 0.7:
            return f"Child {desc} well."
        elif skill_level > 0.4:
            return f"Child {desc} sometimes."
        else:
            return f"Child does not {desc.lower()} yet."

    def generate_batch(self, n: int = 10000) -> List[SyntheticScreening]:
        """Generate n synthetic screening records."""
        domains = [
            "communication",
            "gross_motor",
            "fine_motor",
            "social",
            "cognitive",
        ]
        ages = np.random.choice(
            [18, 24, 36, 48, 60],
            n,
            p=[0.2, 0.3, 0.3, 0.15, 0.05],
        )
        risk_dist = [0.3, 0.4, 0.2, 0.1]  # on_track:monitor:discuss:refer
        risks = ["on_track", "monitor", "discuss", "refer"]

        records = []
        for i in range(n):
            age = int(ages[i])
            domain = str(np.random.choice(domains))
            text = self.generate_caregiver_observation(age, domain)
            risk = str(np.random.choice(risks, p=risk_dist))

            record = SyntheticScreening(
                record_id=f"synth_{i:06d}",
                age_months=age,
                domain=domain,
                caregiver_text=text,
                structured_scores=self._generate_scores(domain, risk),
                visual_features=self._generate_visual_features(age, domain),
                clinician_risk=risk,
            )
            records.append(record)

        return records


def main() -> None:
    """Generate 10K synthetic records and save to parquet."""
    generator = SyntheticDataGenerator()
    batch = generator.generate_batch(10000)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame([r.model_dump() for r in batch])
    train_path = OUTPUT_DIR / "train.parquet"
    df.to_parquet(train_path, index=False)
    print(f"Generated {len(batch)} records -> {train_path}")


if __name__ == "__main__":
    main()
