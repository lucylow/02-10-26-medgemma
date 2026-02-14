"""
MedSigLIP image embedding via local transformers (CPU/GPU).
Fallback when Vertex AI and Hugging Face Inference API are unavailable.
Use for edge deployment, development, or privacy-first on-premise.
"""
import io
from typing import Dict, List, Optional

import numpy as np
from PIL import Image

from app.core.config import settings
from app.core.logger import logger
from app.services.embedding_utils import float32_arr_to_b64, normalize_l2

# Lazy-loaded singleton
_processor = None
_model = None
_device = None


def _load_model() -> bool:
    """Load MedSigLIP model once. Returns True if loaded successfully."""
    global _processor, _model, _device
    if _model is not None:
        return True
    try:
        import torch
        from transformers import AutoImageProcessor, AutoModel

        model_name = settings.HF_MEDSIGLIP_MODEL or "google/medsiglip-base"
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("Loading local MedSigLIP: %s on %s", model_name, _device)

        _processor = AutoImageProcessor.from_pretrained(model_name, trust_remote_code=True)
        _model = AutoModel.from_pretrained(model_name, trust_remote_code=True).to(_device)
        _model.eval()
        logger.info("Local MedSigLIP loaded successfully")
        return True
    except Exception as e:
        logger.warning("Local MedSigLIP load failed: %s", e)
        _processor = None
        _model = None
        return False


def get_medsiglip_embedding_local(image_bytes: bytes) -> Dict:
    """
    Compute MedSigLIP embedding locally.
    Returns dict with: embedding (list), embedding_b64 (str), shape, summary, model.
    """
    if not _load_model():
        raise RuntimeError("Local MedSigLIP not available (transformers/torch required)")

    import torch

    pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    inputs = _processor(images=pil, return_tensors="pt").to(_device)

    with torch.no_grad():
        outputs = _model(**inputs)
        # MedSigLIP/SigLIP: try get_image_features first, else pooler_output, else mean
        if hasattr(_model, "get_image_features"):
            emb = _model.get_image_features(**inputs)
        elif hasattr(outputs, "pooler_output") and outputs.pooler_output is not None:
            emb = outputs.pooler_output
        else:
            emb = outputs.last_hidden_state.mean(dim=1)
        emb = torch.nn.functional.normalize(emb, dim=-1)

    arr = emb.detach().cpu().numpy().astype(np.float32)
    arr = normalize_l2(arr)
    embedding = arr.flatten().tolist()
    shape = list(arr.shape)
    embedding_b64 = float32_arr_to_b64(arr)

    return {
        "embedding": embedding,
        "embedding_b64": embedding_b64,
        "shape": shape,
        "summary": "Local MedSigLIP embedding (no interpretable summary)",
        "model": "medsiglip-local",
    }
