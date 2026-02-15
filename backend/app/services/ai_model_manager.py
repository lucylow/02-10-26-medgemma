"""
AIModelManager: single integration point for MedGemma and MedSigLIP.
Provides analyze_screening(screening: ScreeningPayload) -> ScreeningResult.
Per spec: device selection (cuda/cpu), strict schemas, full provenance.
"""
import asyncio
import base64
import logging
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.schemas.screening import (
    ScreeningPayload,
    ScreeningResult,
    map_legacy_risk_to_spec,
)
from app.services.safety_agent import apply_safety_to_result

logger = logging.getLogger("ai_model_manager")

# Lazy singleton
_medgemma_svc = None


def _get_medgemma_service():
    """Lazy init MedGemmaService when Vertex or HF is configured."""
    global _medgemma_svc
    if _medgemma_svc is None and (
        (settings.HF_MODEL and settings.HF_API_KEY)
        or (settings.VERTEX_PROJECT and settings.VERTEX_LOCATION)
    ):
        from app.services.medgemma_service import MedGemmaService

        _medgemma_svc = MedGemmaService({
            "HF_MODEL": settings.HF_MODEL,
            "HF_API_KEY": settings.HF_API_KEY,
            "VERTEX_PROJECT": settings.VERTEX_PROJECT,
            "VERTEX_LOCATION": settings.VERTEX_LOCATION,
            "VERTEX_TEXT_ENDPOINT_ID": settings.VERTEX_TEXT_ENDPOINT_ID,
            "VERTEX_VISION_ENDPOINT_ID": settings.VERTEX_VISION_ENDPOINT_ID,
            "REDIS_URL": settings.REDIS_URL,
            "ALLOW_PHI": settings.ALLOW_PHI,
            "MEDSIGLIP_ENABLE_LOCAL": getattr(settings, "MEDSIGLIP_ENABLE_LOCAL", True),
            "LORA_ADAPTER_PATH": getattr(settings, "LORA_ADAPTER_PATH", None),
            "BASE_MODEL_ID": getattr(settings, "BASE_MODEL_ID", "google/medgemma-2b-it"),
        })
    return _medgemma_svc


def _mock_screening_result(payload: ScreeningPayload) -> ScreeningResult:
    """Mock result for demo mode when no real model is configured."""
    obs_lower = payload.observations.lower()
    if "few words" in obs_lower or "no words" in obs_lower:
        risk = "monitor"
        conf = 0.65
        clinician = "Observations suggest limited expressive vocabulary for age. Consider formal screening."
        parent = "Based on what you shared, we noticed some patterns around language. A clinician can help explore next steps."
        rationale = ["Parent report indicates limited vocabulary.", "Age-appropriate milestones suggest monitoring."]
        recs = ["Complete ASQ-3 or similar screening.", "Discuss with pediatrician at next visit."]
    elif "on track" in obs_lower or "doing well" in obs_lower:
        risk = "on_track"
        conf = 0.82
        clinician = "Observations align with expected developmental patterns for age."
        parent = "What you shared aligns with typical development for your child's age."
        rationale = ["Reported milestones within expected range."]
        recs = ["Continue routine monitoring.", "Share any new concerns with your clinician."]
    else:
        risk = "monitor"
        conf = 0.58
        clinician = "Observations warrant further screening. No immediate red flags."
        parent = "We noticed some patterns worth discussing with a clinician. This is not a diagnosis."
        rationale = ["Mixed signals in observations.", "Formal screening recommended for clarity."]
        recs = ["Schedule developmental screening.", "Keep notes on new behaviors."]

    scores = {"communication": 0.7, "motor": 0.75, "social": 0.72, "cognitive": 0.68}
    risk, conf, clinician, parent, rationale = apply_safety_to_result(
        risk, conf, clinician, parent, rationale
    )
    return ScreeningResult(
        risk_level=risk,
        confidence=conf,
        clinician_summary=clinician,
        parent_summary=parent,
        rationale=rationale,
        recommendations=recs,
        developmental_scores=scores,
        model_id="mock-demo",
        adapter_id="",
        prompt_version="mock-v1",
        generated_at=datetime.utcnow(),
    )


async def analyze_screening(payload: ScreeningPayload) -> ScreeningResult:
    """
    Main entrypoint: analyze a screening case and return fully populated ScreeningResult.
    Uses MedGemmaService when configured; otherwise returns mock result (demo mode).
    Safety agent is always applied.
    """
    use_mock = getattr(settings, "MOCK_MODE", True)
    svc = _get_medgemma_service()

    if use_mock and not svc:
        return _mock_screening_result(payload)

    image_bytes = None
    if payload.image_b64:
        try:
            image_bytes = base64.b64decode(payload.image_b64)
        except Exception as e:
            logger.warning("Failed to decode image_b64: %s", e)

    if svc:
        result = await svc.analyze_input(
            age_months=payload.child_age_months,
            domain=payload.domain,
            observations=payload.observations,
            image_bytes=image_bytes,
            screening_id=payload.case_id,
        )
        report = result.get("report", {})
        prov = result.get("provenance", {})

        risk_legacy = report.get("riskLevel", "monitor")
        risk = map_legacy_risk_to_spec(risk_legacy)
        conf = float(report.get("confidence", 0.5))
        clinician = report.get("clinical_summary") or "Automated draft."
        parent = report.get("plain_language_summary", "") or clinician
        rationale = report.get("keyFindings", [])
        recs = report.get("recommendations", [])

        # Build developmental_scores from report if available
        scores = report.get("developmental_scores", {})
        if not scores:
            scores = {payload.domain: conf}

        risk, conf, clinician, parent, rationale = apply_safety_to_result(
            risk, conf, clinician, parent, rationale
        )

        return ScreeningResult(
            risk_level=risk,
            confidence=conf,
            clinician_summary=clinician,
            parent_summary=parent,
            rationale=rationale,
            recommendations=recs,
            developmental_scores=scores,
            model_id=prov.get("model_id", settings.BASE_MODEL_ID),
            adapter_id=prov.get("adapter_id", "") or "",
            prompt_version=prov.get("prompt_version", "v1"),
            generated_at=datetime.utcnow(),
        )

    return _mock_screening_result(payload)
