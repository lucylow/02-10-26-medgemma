"""
MedSigLIP embedding API.
Accepts image upload, returns canonical embedding payload (base64 float32, L2-normalized).
Chain: Local (if enabled) -> Vertex -> Hugging Face.
"""
import io
import time
from typing import Optional

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from app.core.config import settings
from app.core.logger import logger
from app.errors import ApiError, ErrorCodes

router = APIRouter(prefix="/api", tags=["embed"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB


class ImageMeta(BaseModel):
    width: int
    height: int
    color_space: str = "RGB"


class EmbeddingResponse(BaseModel):
    embedding_b64: str
    shape: list
    emb_version: str = "medsiglip-v1"
    image_meta: Optional[ImageMeta] = None
    model: str = "medsiglip"


@router.post("/embed", response_model=EmbeddingResponse)
async def embed_image(file: UploadFile = File(...)):
    """
    Compute MedSigLIP embedding for an image.
    Returns canonical payload: embedding_b64 (float32 bytes), shape, emb_version.
    """
    start = time.time()
    contents = await file.read()

    if len(contents) > MAX_UPLOAD_BYTES:
        raise ApiError(
            ErrorCodes.PAYLOAD_TOO_LARGE,
            f"Image exceeds max size ({MAX_UPLOAD_BYTES // (1024*1024)}MB)",
            status_code=413,
            details={"max_bytes": MAX_UPLOAD_BYTES},
        )

    from PIL import Image

    try:
        pil = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise ApiError(
            ErrorCodes.INVALID_IMAGE,
            f"Invalid image: {e}",
            status_code=400,
        ) from e

    image_meta = ImageMeta(width=pil.width, height=pil.height, color_space="RGB")

    # Chain: Local -> Vertex -> HF
    result = None
    model_used = None

    # 1. Local (if transformers/torch available)
    if settings.MEDSIGLIP_ENABLE_LOCAL:
        try:
            from app.services.medsiglip_local import get_medsiglip_embedding_local

            out = get_medsiglip_embedding_local(contents)
            result = {
                "embedding_b64": out["embedding_b64"],
                "shape": out["shape"],
                "model": out["model"],
            }
            model_used = out["model"]
        except Exception as e:
            logger.debug("Local MedSigLIP skipped: %s", e)

    # 2. Vertex
    if not result and settings.VERTEX_PROJECT and settings.VERTEX_LOCATION:
        try:
            import asyncio
            from app.services.medsiglip_vertex import get_medsiglip_embedding
            from app.services.embedding_utils import list_to_b64

            vis = await asyncio.to_thread(get_medsiglip_embedding, contents)
            if vis.get("embedding"):
                b64, shape = list_to_b64(vis["embedding"])
                result = {"embedding_b64": b64, "shape": shape, "model": vis["model"]}
                model_used = vis["model"]
        except Exception as e:
            logger.debug("Vertex MedSigLIP skipped: %s", e)

    # 3. Hugging Face
    if not result:
        try:
            from app.services.medsiglip_hf import get_medsiglip_embedding_hf
            from app.services.embedding_utils import list_to_b64

            vis = await get_medsiglip_embedding_hf(contents)
            if vis.get("embedding"):
                b64, shape = list_to_b64(vis["embedding"])
                result = {"embedding_b64": b64, "shape": shape, "model": vis["model"]}
                model_used = vis["model"]
        except Exception as e:
            logger.debug("HF MedSigLIP skipped: %s", e)

    if not result:
        raise ApiError(
            ErrorCodes.SERVICE_UNAVAILABLE,
            "No MedSigLIP backend available (configure Vertex, HF, or local transformers)",
            status_code=503,
        )

    elapsed = time.time() - start
    logger.info("embed done: model=%s shape=%s time=%.3fs", model_used, result["shape"], elapsed)

    return EmbeddingResponse(
        embedding_b64=result["embedding_b64"],
        shape=result["shape"],
        emb_version="medsiglip-v1",
        image_meta=image_meta,
        model=model_used,
    )
