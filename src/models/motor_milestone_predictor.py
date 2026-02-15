"""
PediScreen AI - Motor Milestone Predictor

Integrates walking onset DNN with PediScreen screening pipeline.
Feeds into MedGemma reasoning for comprehensive developmental assessment.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

# Resolve model path relative to project root
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "training" / "walking_milestone_model_complete.pth"


class MotorMilestonePredictor:
    """Predict walking onset risk from longitudinal child development data."""

    def __init__(self, model_path: str | Path | None = None):
        self.model_path = Path(model_path or DEFAULT_MODEL_PATH)
        self._predict_fn = None

    def _load_model(self) -> None:
        """Lazy-load predict function."""
        if self._predict_fn is not None:
            return
        try:
            import sys

            # Ensure training module is on path when run from project root
            training_dir = PROJECT_ROOT / "training"
            if str(training_dir) not in sys.path:
                sys.path.insert(0, str(PROJECT_ROOT))

            from training.train_walking_milestones import predict_walking_age

            self._predict_fn = predict_walking_age
        except ImportError as e:
            raise ImportError(
                "Install torch and run training first: pip install torch scikit-learn"
            ) from e

    def predict_walking_risk(self, child_data: pd.DataFrame) -> dict[str, Any]:
        """
        Integrate with PediScreen screening pipeline.

        Args:
            child_data: DataFrame with columns age_months, weight_z, length_z,
                headcirc_z, rolls_over, sits_no_support, stands_support

        Returns:
            Dict with milestone, predicted_age_months, risk_level, confidence
        """
        self._load_model()
        probs = self._predict_fn(str(self.model_path), child_data)

        # Handle single row or batch
        prob = float(probs.flatten()[0]) if probs.size > 0 else 0.0

        return {
            "milestone": "walking_alone",
            "predicted_age_months": int(12 + prob * 6),  # 12-18mo range
            "risk_level": "monitor" if prob > 0.7 else "on_track",
            "confidence": prob,
        }


def predict_walking_risk(child_data: pd.DataFrame, model_path: str | Path | None = None) -> dict[str, Any]:
    """Convenience function for single prediction."""
    predictor = MotorMilestonePredictor(model_path=model_path)
    return predictor.predict_walking_risk(child_data)
