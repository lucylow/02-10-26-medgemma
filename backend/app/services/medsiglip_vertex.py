"""
MedSigLIP image embedding via Vertex AI.
Calls a Vertex-hosted MedSigLIP-like model for image embeddings + interpretable visual summary.
 HIPAA-friendly when running on GCP.
"""
import base64
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logger import logger

try:
    from google.cloud import aiplatform
    _HAS_VERTEX = True
except Exception:
    _HAS_VERTEX = False


def get_medsiglip_embedding(image_bytes: bytes) -> Dict:
    """
    Calls a Vertex-hosted MedSigLIP-like model.
    Returns embedding + interpretable visual summary.
    """
    if not _HAS_VERTEX or not settings.VERTEX_PROJECT or not settings.VERTEX_LOCATION:
        raise RuntimeError("Vertex AI not configured for MedSigLIP")

    endpoint_id = settings.VERTEX_MEDSIGLIP_ENDPOINT_ID or settings.VERTEX_VISION_ENDPOINT_ID
    if not endpoint_id:
        raise RuntimeError("VERTEX_MEDSIGLIP_ENDPOINT_ID or VERTEX_VISION_ENDPOINT_ID required")

    aiplatform.init(project=settings.VERTEX_PROJECT, location=settings.VERTEX_LOCATION)
    endpoint = aiplatform.Endpoint(
        endpoint_name=f"projects/{settings.VERTEX_PROJECT}/locations/{settings.VERTEX_LOCATION}/endpoints/{endpoint_id}"
    )

    instance = {
        "image": {
            "bytesBase64Encoded": base64.b64encode(image_bytes).decode("utf-8")
        }
    }

    response = endpoint.predict(instances=[instance])
    preds = response.predictions[0]

    embedding: List[float] = list(preds.get("embedding", []))
    summary = preds.get("visual_summary") or preds.get("summary") or "No visual summary provided"

    return {
        "embedding": embedding,
        "summary": summary,
        "model": "medsiglip-vertex"
    }
