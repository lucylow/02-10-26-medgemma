"""
MedSigLIP image embedding via Hugging Face Inference API (fallback when Vertex unavailable).
"""
import base64
from typing import Dict, List

import httpx

from app.core.config import settings
from app.core.logger import logger

HF_MODEL = "google/medsiglip-base"


async def get_medsiglip_embedding_hf(image_bytes: bytes) -> Dict:
    """
    Hugging Face fallback for MedSigLIP embeddings.
    HF Inference API may not return visual_summary; embedding is primary.
    """
    token = settings.HF_MEDSIGLIP_TOKEN or settings.HF_API_KEY
    if not token:
        raise RuntimeError("HF_MEDSIGLIP_TOKEN or HF_API_KEY required for MedSigLIP HF fallback")

    model = settings.HF_MEDSIGLIP_MODEL or HF_MODEL
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"https://api-inference.huggingface.co/models/{model}",
            headers=headers,
            files={"file": image_bytes},
        )
    r.raise_for_status()
    out = r.json()

    # HF inference API format varies; handle both array and object responses
    embedding: List[float] = []
    if isinstance(out, list):
        embedding = out
    elif isinstance(out, dict):
        embedding = out.get("embedding", out.get("embeddings", [[]]))[0] if isinstance(out.get("embedding"), list) else out.get("embedding", [])
        if not embedding and "embeddings" in out:
            embedding = out["embeddings"][0] if out["embeddings"] else []

    return {
        "embedding": embedding,
        "summary": (out.get("visual_summary") or "") if isinstance(out, dict) else "",
        "model": model
    }
