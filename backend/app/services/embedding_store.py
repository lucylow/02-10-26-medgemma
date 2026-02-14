"""
Persist image embeddings to MongoDB for longitudinal tracking.
Enables cosine similarity across screenings (e.g., "Is fine motor improving over time?").
Supports canonical format: embedding (list) or embedding_b64 + shape for base64 float32.
"""
import time
from typing import Optional, List, Union

from app.services.db import get_db
from app.core.logger import logger


async def store_embedding(
    screening_id: str,
    report_id: Optional[str],
    model: str,
    embedding: Optional[list] = None,
    metadata: Optional[dict] = None,
    embedding_b64: Optional[str] = None,
    shape: Optional[List[int]] = None,
) -> None:
    """
    Store an image embedding in the image_embeddings collection.
    Provide either embedding (list) or (embedding_b64, shape) for canonical base64 format.
    """
    if embedding is None and (embedding_b64 is None or shape is None):
        raise ValueError("Provide either embedding or (embedding_b64, shape)")

    db = get_db()
    doc = {
        "screening_id": screening_id,
        "report_id": report_id,
        "model": model,
        "metadata": metadata or {},
        "created_at": time.time(),
    }
    if embedding is not None:
        doc["embedding"] = embedding
    else:
        doc["embedding_b64"] = embedding_b64
        doc["shape"] = shape

    try:
        await db.image_embeddings.insert_one(doc)
        logger.info("Stored embedding for screening %s report %s", screening_id, report_id)
    except Exception as e:
        logger.exception("Failed to store embedding: %s", e)
        raise


def _embedding_from_doc(doc: dict) -> Optional[List[float]]:
    """Extract embedding list from stored doc (supports both list and b64 formats)."""
    if doc.get("embedding"):
        return doc["embedding"]
    if doc.get("embedding_b64") and doc.get("shape"):
        from app.services.embedding_utils import b64_to_list
        return b64_to_list(doc["embedding_b64"], doc["shape"])
    return None
