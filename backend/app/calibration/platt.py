"""
Platt scaling for clinical probabilities (HAI-DEF).
Trained on ASQ-3 gold standard; converts raw logits/scores to calibrated probabilities.
"""
from typing import Dict

try:
    from scipy.special import expit
except ImportError:
    def expit(x):
        import math
        return 1.0 / (1.0 + math.exp(-x))


class ClinicalCalibrator:
    """Platt scaling parameters per adapter and risk level (ASQ-3 gold n≈10K)."""

    PLATT_PARAMS: Dict[str, Dict[str, Dict[str, float]]] = {
        "pediscreen-v1": {
            "referral": {"alpha": -2.34, "beta": 3.87},
            "urgent": {"alpha": -0.92, "beta": 2.14},
            "monitor": {"alpha": 0.45, "beta": 1.23},
            "ontrack": {"alpha": 1.2, "beta": 0.8},
        },
        "base-medgemma": {
            "referral": {"alpha": -2.1, "beta": 3.5},
            "urgent": {"alpha": -0.7, "beta": 2.0},
            "monitor": {"alpha": 0.3, "beta": 1.1},
            "ontrack": {"alpha": 1.0, "beta": 0.7},
        },
        "rop-detector-v1": {
            "zone1_stage3+": {"alpha": -3.12, "beta": 4.56},
        },
    }

    @staticmethod
    def calibrate(raw_logit: float, adapter_id: str, risk_level: str) -> float:
        """Convert raw logit/score to clinical probability: P(y=1|x) = sigmoid(alpha + beta * logit)."""
        params = (
            ClinicalCalibrator.PLATT_PARAMS.get(adapter_id, {})
            .get(risk_level)
        )
        if not params:
            return max(0.01, min(0.99, raw_logit))
        calibrated = expit(params["alpha"] + params["beta"] * raw_logit)
        return max(0.01, min(0.99, calibrated))

    @staticmethod
    def age_adjusted_threshold(age_months: int, domain: str) -> float:
        """Age-stratified clinical cutoffs (probability threshold for referral)."""
        base_cutoffs: Dict[str, float] = {
            "communication": 0.15 if age_months < 12 else 0.12,
            "gross_motor": 0.18,
            "fine_motor": 0.18,
            "problem_solving": 0.15,
            "personal_social": 0.12,
        }
        return base_cutoffs.get(domain, 0.10)
