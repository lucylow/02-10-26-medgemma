"""
Embedding Agent: converts image_b64 → MedSigLIP embedding.
Outputs: embedding (float32 array), model name, shape.
Uses backend MedSigLIP when available; mock fallback otherwise.
"""
import base64
import logging
from typing import List, Optional, Tuple

logger = logging.getLogger("orchestrator.embedding")


def run_embedding(image_b64: Optional[str]) -> Tuple[Optional[List[float]], str, List[int]]:
    """
    Run MedSigLIP on image. Returns (embedding, model, shape).
    Falls back to mock zero-vector when no image or embedding service unavailable.
    """
    if not image_b64:
        return None, "none", [1, 256]

    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception as e:
        logger.warning("Embedding agent: invalid image_b64: %s", e)
        return None, "none", [1, 256]

    # Try backend MedSigLIP when available (sync)
    try:
        from app.services.medsiglip_local import get_medsiglip_embedding_local

        vis = get_medsiglip_embedding_local(image_bytes)
        if vis and vis.get("embedding"):
            emb = vis["embedding"]
            if hasattr(emb, "tolist"):
                arr = emb.tolist()
            elif hasattr(emb, "shape"):
                arr = list(emb)
            else:
                arr = list(emb)
            shape = [1, len(arr)]
            return arr, "medsiglip-v1", shape
    except ImportError:
        pass
    except Exception as e:
        logger.debug("MedSigLIP local skipped: %s", e)

    # Mock fallback
    arr = [0.0] * 256
    arr[0] = 1.0
    return arr, "mock-fallback", [1, 256]
