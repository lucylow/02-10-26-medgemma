"""Mock client for CI and demos. No GPU or API required."""
import os
from typing import Optional
from .schemas import ScreeningRequest, ScreeningResponse


class MockMedGemmaClient:
    def screen(self, req: ScreeningRequest) -> ScreeningResponse:
        return ScreeningResponse(
            risk="moderate",
            recommendations=[
                "Complete ASQ-3 if not done.",
                "Follow up in 3 months.",
            ],
            confidence=0.7,
            adapter_id=os.environ.get("MOCK_ADAPTER_ID", "mock-pediscreen-v1"),
            model_id="mock/medgemma-2b",
            evidence=[],
            reasoning_chain=["Mock path for CI/demo."],
            clinical_summary="Mock screening summary for testing.",
            raw_json={"risk_stratification": {"level": "moderate"}},
            inference_time_s=0.01,
            fallback_used=True,
        )
