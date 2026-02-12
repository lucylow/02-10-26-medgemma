"""
Persist image embeddings to MongoDB for longitudinal tracking.
Enables cosine similarity across screenings (e.g., "Is fine motor improving over time?").
"""
import time
from typing import Optional

from app.services.db import get_db
from app.core.logger import logger


async def store_embedding(
    screening_id: str,
    report_id: Optional[str],
    model: str,
    embedding: list,
    metadata: dict,
) -> None:
    """Store an image embedding in the image_embeddings collection."""
    db = get_db()
    doc = {
        "screening_id": screening_id,
        "report_id": report_id,
        "model": model,
        "embedding": embedding,
        "metadata": metadata,
        "created_at": time.time(),
    }
    try:
        await db.image_embeddings.insert_one(doc)
        logger.info("Stored embedding for screening %s report %s", screening_id, report_id)
    except Exception as e:
        logger.exception("Failed to store embedding: %s", e)
        raise
