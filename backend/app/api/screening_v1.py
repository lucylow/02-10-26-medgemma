"""
API v1 screening: strict ScreeningPayload → ScreeningResult.
Uses AIModelManager when configured; mock data when MOCK_MODE=True and no model.
"""
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.security import get_api_key
from app.schemas.screening import ScreeningPayload, ScreeningResult, map_legacy_risk_to_spec
from app.services.ai_model_manager import analyze_screening
from app.services.mock_screenings import get_mock_case_by_observations
from app.services.safety_agent import apply_safety_to_result

router = APIRouter()


@router.post("/api/v1/screening", response_model=ScreeningResult)
async def screening_v1(payload: ScreeningPayload, _=Depends(get_api_key)):
    """
    Submit screening with strict schema. Returns fully populated ScreeningResult.
    Uses mock data when MOCK_MODE=True and no MedGemma configured.
    """
    use_mock = getattr(settings, "MOCK_MODE", True)

    # Optional: use prebuilt mock case when in demo mode for consistent demo UX
    if use_mock:
        mock = get_mock_case_by_observations(
            payload.observations,
            payload.child_age_months,
            payload.domain,
        )
        if mock:
            risk, conf = mock["risk_level"], 0.72
            clinician = mock["clinician_summary"]
            parent = mock["parent_summary"]
            rationale = mock["rationale"]
            recs = mock["recommendations"]
            risk, conf, clinician, parent, rationale = apply_safety_to_result(
                risk, conf, clinician, parent, rationale
            )
            from datetime import datetime

            return ScreeningResult(
                risk_level=risk,
                confidence=conf,
                clinician_summary=clinician,
                parent_summary=parent,
                rationale=rationale,
                recommendations=recs,
                developmental_scores={payload.domain: conf},
                model_id="mock-demo",
                adapter_id="",
                prompt_version="mock-v1",
                generated_at=datetime.utcnow(),
            )

    result = await analyze_screening(payload)
    return result
