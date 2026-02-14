"""
Standalone MedSigLIP embedding server (production-grade).
Run: uvicorn server.embed_server:app --host 0.0.0.0 --port 5000

Supports: image_meta, health with memory, request size limits, canonical embedding format.
"""
import base64
import io
import os
import time
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from loguru import logger
from PIL import Image
from pydantic import BaseModel

# Request body limit: 10MB for image uploads
MAX_UPLOAD_BYTES = int(os.getenv("MEDSIGLIP_MAX_UPLOAD_BYTES", 10 * 1024 * 1024))

app = FastAPI(
    title="MedSigLIP Embed Server",
    description="Production embedding server for PediScreen AI visual evidence",
)

MODEL_NAME = os.getenv("MEDSIGLIP_MODEL_NAME", "google/medsiglip-base")
USE_REAL_MODEL = os.getenv("USE_REAL_MEDSIGLIP", "1") == "1"
EMB_VERSION = os.getenv("MEDSIGLIP_EMB_VERSION", "medsiglip-v1")

device = None
processor = None
model = None


class ImageMeta(BaseModel):
    width: int
    height: int
    color_space: str = "RGB"


class EmbeddingResponse(BaseModel):
    embedding_b64: str
    shape: list
    emb_version: str = EMB_VERSION
    image_meta: Optional[ImageMeta] = None


def _mock_embedding_from_bytes(b: bytes, dim: int = 256) -> np.ndarray:
    seed = int.from_bytes(base64.b16encode(b)[:8], "little") % (2**32)
    rng = np.random.RandomState(seed)
    arr = rng.normal(size=(1, dim)).astype("float32")
    arr = arr / (np.linalg.norm(arr, axis=-1, keepdims=True) + 1e-12)
    return arr


def _load_medsiglip():
    global device, processor, model
    if processor is not None:
        return
    import torch
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Loading MedSigLIP model: %s", MODEL_NAME)
    try:
        from transformers import AutoImageProcessor, AutoModel
        processor = AutoImageProcessor.from_pretrained(MODEL_NAME, trust_remote_code=True)
        model = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True).to(device)
        model.eval()
        logger.info("MedSigLIP loaded on %s", device)
    except Exception as e:
        logger.warning("MedSigLIP load failed, using mock: %s", e)
        processor = None
        model = None


def _tensor_to_base64_float32(t):
    import torch
    arr = t.detach().cpu().numpy().astype(np.float32)
    b = arr.tobytes()
    return base64.b64encode(b).decode("ascii"), list(arr.shape)


def _get_memory_mb() -> Optional[float]:
    """Return GPU memory used in MB if available, else None."""
    try:
        import torch
        if torch.cuda.is_available():
            return torch.cuda.memory_allocated() / (1024 * 1024)
    except Exception:
        pass
    return None


@app.on_event("startup")
async def startup():
    if USE_REAL_MODEL:
        _load_medsiglip()


@app.post("/embed", response_model=EmbeddingResponse)
async def embed(file: UploadFile = File(...)):
    start = time.time()
    contents = await file.read()

    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds max size ({MAX_UPLOAD_BYTES // (1024*1024)}MB)",
        )

    try:
        pil = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"bad image: {e}")

    image_meta = ImageMeta(width=pil.width, height=pil.height, color_space="RGB")

    if processor is not None and model is not None:
        import torch
        inputs = processor(images=pil, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model(**inputs)
            if hasattr(outputs, "pooler_output") and outputs.pooler_output is not None:
                emb = outputs.pooler_output
            else:
                emb = outputs.last_hidden_state.mean(dim=1)
            emb = torch.nn.functional.normalize(emb, dim=-1)
            b64, shape = _tensor_to_base64_float32(emb)
        elapsed = time.time() - start
        logger.info("embed done: shape=%s time=%.3fs", shape, elapsed)
        return EmbeddingResponse(
            embedding_b64=b64,
            shape=shape,
            emb_version=EMB_VERSION,
            image_meta=image_meta,
        )
    else:
        arr = _mock_embedding_from_bytes(contents)
        b64 = base64.b64encode(arr.tobytes()).decode("ascii")
        return EmbeddingResponse(
            embedding_b64=b64,
            shape=list(arr.shape),
            emb_version="mock-" + EMB_VERSION,
            image_meta=image_meta,
        )


@app.get("/health")
def health():
    """Health check with model status, device, and memory usage."""
    mem_mb = _get_memory_mb()
    return {
        "ok": True,
        "model_loaded": model is not None,
        "device": str(device) if device else "none",
        "memory_mb": round(mem_mb, 2) if mem_mb is not None else None,
        "emb_version": EMB_VERSION,
    }
