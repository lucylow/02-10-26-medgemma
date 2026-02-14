"""
MedSigLIP embedding logic. Supports real, dummy, and hybrid modes.
Attempts real model; falls back to deterministic embeddings on error.
"""
import base64
import hashlib
import io
import logging
import os

import numpy as np
from PIL import Image

logger = logging.getLogger("embed_server")
logger.setLevel(logging.INFO)

EMBED_MODE = os.getenv("EMBED_MODE", "real")  # real | dummy | hybrid
MEDSIGLIP_MODEL = os.getenv("MEDSIGLIP_MODEL", "google/medsiglip-base")
MODEL_LOAD_TIMEOUT = int(os.getenv("MODEL_LOAD_TIMEOUT_SEC", "60"))
FALLBACK_ON_ERROR = os.getenv("FALLBACK_ON_ERROR", "true").lower() in ("1", "true", "yes")

# Backward compat
_USE_DUMMY = os.getenv("USE_DUMMY", "0") in ("1", "true", "True")
if _USE_DUMMY or EMBED_MODE == "dummy":
    MODE = "dummy"
elif EMBED_MODE == "hybrid":
    MODE = "hybrid"
else:
    MODE = "real"

MODEL_NAME = MEDSIGLIP_MODEL

# Lazy-loaded globals for real mode
_processor = None
_model = None
_device = None
_model_loaded = False


def _get_device():
    import torch

    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _load_medsiglip():
    global _processor, _model, _device, _model_loaded
    if _model is not None:
        return
    import torch
    from transformers import AutoImageProcessor, AutoModel

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        logger.info("Attempting to load MedSigLIP (%s) on %s", MEDSIGLIP_MODEL, _device)
        _processor = AutoImageProcessor.from_pretrained(
            MEDSIGLIP_MODEL, trust_remote_code=True
        )
        _model = AutoModel.from_pretrained(
            MEDSIGLIP_MODEL, trust_remote_code=True
        ).to(_device)
        _model.eval()
        _model_loaded = True
        logger.info("MedSigLIP loaded successfully.")
    except Exception as e:
        logger.exception("Failed to load MedSigLIP: %s", e)
        _processor = None
        _model = None
        _model_loaded = False
        if EMBED_MODE == "real" and not FALLBACK_ON_ERROR:
            raise


def _deterministic_embedding_from_bytes(b: bytes, dim: int = 256) -> np.ndarray:
    """Deterministic embedding from image bytes (per-image, reproducible)."""
    h = hashlib.sha256(b).digest()
    seed = int.from_bytes(h[:8], "big") & ((1 << 63) - 1)
    rng = np.random.RandomState(seed % (2**31 - 1))
    emb = rng.normal(size=(1, dim)).astype("float32")
    norm = np.linalg.norm(emb)
    if norm > 0:
        emb = emb / norm
    return emb


def image_to_pil(file_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(file_bytes)).convert("RGB")


def compute_embedding(file_bytes: bytes) -> tuple[bytes, list[int], str]:
    """
    Compute embedding from image bytes.
    Returns (embedding_b64, shape, emb_version).
    """
    pil = image_to_pil(file_bytes)

    if MODE == "dummy":
        arr = _deterministic_embedding_from_bytes(file_bytes)
        b64 = base64.b64encode(arr.tobytes()).decode("ascii")
        return b64, list(arr.shape), "medsiglip-v1-dummy"

    # real or hybrid: try real model
    if MODE == "real" or MODE == "hybrid":
        _load_medsiglip()
        import torch

        device = _get_device()
        if _processor is not None and _model is not None:
            try:
                inputs = _processor(images=pil, return_tensors="pt").to(device)
                with torch.no_grad():
                    outputs = _model(**inputs)
                    if (
                        hasattr(outputs, "pooler_output")
                        and outputs.pooler_output is not None
                    ):
                        emb = outputs.pooler_output
                    else:
                        emb = outputs.last_hidden_state.mean(dim=1)
                    emb = torch.nn.functional.normalize(emb, dim=-1)
                arr = emb.detach().cpu().numpy().astype(np.float32)
                b64 = base64.b64encode(arr.tobytes()).decode("ascii")
                return b64, list(arr.shape), "medsiglip-v1"
            except Exception as e:
                logger.exception("Real embedding failed: %s", e)
                if not FALLBACK_ON_ERROR:
                    raise
                # fall through to deterministic fallback

    # Fallback: deterministic per-image embedding
    arr = _deterministic_embedding_from_bytes(file_bytes)
    b64 = base64.b64encode(arr.tobytes()).decode("ascii")
    return b64, list(arr.shape), "medsiglip-v1-fallback"
