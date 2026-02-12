# backend/app/services/radiology_vision.py
"""
Radiology image analysis for triage urgency scoring.
Uses MedSigLIP / MedGemma Vision to produce embeddings and risk indicators.
risk_score is NOT a diagnosis — it's a relative concern indicator (0–1) for queue prioritization.
"""
import base64
import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger("radiology.vision")

# Optional Vertex AI
try:
    from google.cloud import aiplatform
    _HAS_VERTEX = True
except Exception:
    _HAS_VERTEX = False


def _derive_risk_from_summary(visual_summary: Optional[str], modality: str) -> float:
    """
    Conservative heuristic: derive risk_score from visual summary keywords.
    Used when Vision endpoint doesn't return risk_score directly.
    """
    if not visual_summary:
        return 0.3

    lower = visual_summary.lower()

    # High-concern keywords (stat-level)
    stat_keywords = [
        "hemorrhage", "stroke", "pneumothorax", "tension",
        "fracture", "dislocation", "ischemia", "infarct",
        "rupture", "obstruction", "mass effect", "herniation",
    ]
    for kw in stat_keywords:
        if kw in lower:
            return 0.92

    # Urgent-level keywords
    urgent_keywords = [
        "opacity", "consolidation", "effusion", "nodule",
        "infiltration", "atelectasis", "fluid", "edema",
        "enlargement", "abnormality", "density",
    ]
    for kw in urgent_keywords:
        if kw in lower:
            return 0.70

    return 0.3


async def analyze_radiology_image(
    image_bytes: bytes,
    modality: str = "XR",
) -> Dict[str, Any]:
    """
    Analyze radiology image for triage urgency.
    Returns dict with: embedding, key_findings (list), risk_score (float 0–1).
    """
    embedding: Optional[List[float]] = None
    key_findings: List[str] = []
    risk_score = 0.3

    # Use MedGemmaService vision when configured
    medgemma_svc = _get_medgemma_svc()
    if medgemma_svc:
        try:
            emb, visual_summary = await medgemma_svc._get_image_embedding(image_bytes)
            embedding = emb
            if visual_summary:
                key_findings = [visual_summary]
                risk_score = _derive_risk_from_summary(visual_summary, modality)
        except Exception as e:
            logger.warning("MedGemma vision failed for radiology: %s", e)

    # Vertex radiology endpoint (if configured separately)
    if (
        _HAS_VERTEX
        and settings.VERTEX_PROJECT
        and settings.VERTEX_LOCATION
        and settings.VERTEX_RADIOLOGY_ENDPOINT_ID
    ):
        try:
            aiplatform.init(project=settings.VERTEX_PROJECT, location=settings.VERTEX_LOCATION)
            endpoint = aiplatform.Endpoint(
                f"projects/{settings.VERTEX_PROJECT}/locations/{settings.VERTEX_LOCATION}/endpoints/{settings.VERTEX_RADIOLOGY_ENDPOINT_ID}"
            )
            instance = {
                "image": {"bytesBase64Encoded": base64.b64encode(image_bytes).decode()},
                "task": "radiology_triage",
            }
            resp = endpoint.predict(instances=[instance])
            out = resp.predictions[0] if resp.predictions else {}
            embedding = out.get("embedding") or embedding
            key_findings = out.get("key_findings", key_findings)
            risk_score = float(out.get("risk_score", risk_score))
        except Exception as e:
            logger.warning("Vertex radiology endpoint failed: %s", e)

    return {
        "embedding": embedding,
        "findings": key_findings or ["No AI findings available; clinician review required."],
        "risk_score": min(1.0, max(0.0, risk_score)),
    }


_medgemma_svc = None


def _get_medgemma_svc():
    """Lazy init MedGemmaService for radiology vision."""
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
        })
    return _medgemma_svc
