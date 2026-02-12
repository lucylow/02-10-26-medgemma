# orchestrator/embedding_service.py
"""
Calls the embed server to compute image embeddings.
Returns {"model", "shape", "b64"} or raises.
"""
import os
import base64
import io
import requests
from loguru import logger

EMBED_SERVER_URL = os.getenv("EMBED_SERVER_URL", "http://embed-server:5000/embed")


def compute_embedding(*, image_path: str = None, image_b64: str = None):
    """
    Compute embedding from image_path (local file) or image_b64 (base64 string).
    Returns dict with model, shape, b64.
    """
    if image_path:
        with open(image_path, "rb") as f:
            files = {"file": ("image.png", f, "image/png")}
            r = requests.post(EMBED_SERVER_URL, files=files, timeout=30)
    elif image_b64:
        raw = base64.b64decode(image_b64)
        files = {"file": ("image.png", io.BytesIO(raw), "image/png")}
        r = requests.post(EMBED_SERVER_URL, files=files, timeout=30)
    else:
        raise ValueError("Either image_path or image_b64 must be provided")

    r.raise_for_status()
    data = r.json()
    return {
        "model": data.get("emb_version", "medsiglip-v1"),
        "b64": data.get("embedding_b64", data.get("b64")),
        "shape": data.get("shape", []),
    }
