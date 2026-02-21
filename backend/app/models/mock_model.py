"""
Mock reasoning model for dev/tests and MODEL_BACKEND=mock.
Deterministic output from case_id; implements BaseModel.
"""
import hashlib
import logging
from typing import Any, Dict

from app.models.interface import BaseModel

logger = logging.getLogger(__name__)


class MockModel(BaseModel):
    """Deterministic mock for demos and tests."""

    def __init__(self, prompt_version: str = "v2.1-mock"):
        self.prompt_version = prompt_version

    def infer(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        case_id = input_data.get("case_id", "default")
        seed = hashlib.sha256(case_id.encode()).digest()
        risks = ["low", "monitor", "high", "refer"]
        risk = risks[seed[0] % len(risks)]
        return {
            "summary": [f"Mock summary for case {case_id}."],
            "risk": risk,
            "confidence": 0.5 + (seed[1] % 50) / 100.0,
            "recommendations": ["Continue monitoring."] if risk == "low" else ["Return for recheck in 3 months."],
            "reasoning_chain": ["Mock fallback used."],
            "evidence": [],
            "parent_text": None,
            "model_id": "mock",
            "prompt_version": self.prompt_version,
            "fallback": True,
        }

    def health_check(self) -> bool:
        return True

    def metadata(self) -> Dict[str, Any]:
        return {"model_id": "mock", "prompt_version": self.prompt_version}
