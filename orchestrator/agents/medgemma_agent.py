"""
MedGemma Agent: builds structured payload and calls AIModelManager.analyze_screening.
"""
import asyncio
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("orchestrator.medgemma")


async def run_medgemma(
    case_id: str,
    child_age_months: int,
    domain: str,
    observations: str,
    image_b64: Optional[str],
    role: str,
    visual_summary: Optional[str] = None,
    temporal_descriptor: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Call AIModelManager.analyze_screening. Returns ScreeningResult as dict.
    """
    try:
        from app.schemas.screening import ScreeningPayload
        from app.services.ai_model_manager import analyze_screening

        payload = ScreeningPayload(
            case_id=case_id,
            child_age_months=child_age_months,
            domain=domain,
            observations=observations,
            image_b64=image_b64,
            role=role,
        )
        result = await analyze_screening(payload)
        return result.model_dump()
    except ImportError as e:
        logger.warning("Backend not available, using mock: %s", e)
        return _mock_result(case_id, child_age_months, domain, observations, role)
    except Exception as e:
        logger.exception("MedGemma agent failed: %s", e)
        return _mock_result(case_id, child_age_months, domain, observations, role)


def _mock_result(
    case_id: str,
    child_age_months: int,
    domain: str,
    observations: str,
    role: str,
) -> Dict[str, Any]:
    """Fallback mock when backend unavailable."""
    from datetime import datetime

    obs_lower = (observations or "").lower()
    if "few words" in obs_lower or "no words" in obs_lower:
        risk, conf = "monitor", 0.65
        clinician = "Observations suggest limited expressive vocabulary for age."
        parent = "Based on what you shared, we noticed some patterns around language."
    elif "on track" in obs_lower:
        risk, conf = "on_track", 0.82
        clinician = "Observations align with expected developmental patterns."
        parent = "What you shared aligns with typical development."
    else:
        risk, conf = "monitor", 0.58
        clinician = "Observations warrant further screening."
        parent = "We noticed some patterns worth discussing with a clinician."

    return {
        "risk_level": risk,
        "confidence": conf,
        "clinician_summary": clinician,
        "parent_summary": parent,
        "rationale": ["Mock reasoning for demo."],
        "recommendations": ["Complete formal screening.", "Discuss with pediatrician."],
        "developmental_scores": {domain: conf},
        "model_id": "mock-orchestrator",
        "adapter_id": "",
        "prompt_version": "mock-v1",
        "generated_at": datetime.utcnow().isoformat(),
    }
