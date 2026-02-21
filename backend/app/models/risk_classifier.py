"""
Risk classifier: maps structured signals or model output to risk category.
Adapter or heuristic; used in pipeline after reasoning model.
"""
import hashlib
import logging
from typing import Any, Dict, List

from app.models.interface import BaseModel

logger = logging.getLogger(__name__)

RISK_LEVELS = ("low", "monitor", "high", "refer", "manual_review_required")


class RiskClassifier(BaseModel):
    """Converts model output + signals into a single risk category."""

    def infer(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        risk = input_data.get("risk")
        if risk in RISK_LEVELS:
            return {"risk": risk, "risk_source": "model", **input_data}
        # Heuristic: confidence low -> manual_review_required
        conf = input_data.get("confidence", 0.5)
        if conf < 0.5:
            return {**input_data, "risk": "manual_review_required", "risk_source": "heuristic_low_confidence"}
        return {**input_data, "risk": "monitor", "risk_source": "heuristic_default"}

    def health_check(self) -> bool:
        return True

    def metadata(self) -> Dict[str, Any]:
        return {"type": "risk_classifier", "version": "v1"}


class MockRiskClassifier(RiskClassifier):
    """Deterministic risk from case_id for tests."""

    def infer(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        case_id = input_data.get("case_id", "")
        seed = int(hashlib.sha256(case_id.encode()).hexdigest()[:8], 16)
        risk = RISK_LEVELS[seed % len(RISK_LEVELS)]
        return {**input_data, "risk": risk, "risk_source": "mock"}
