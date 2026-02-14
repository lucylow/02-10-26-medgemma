"""
Data retention worker — automated deletion/archival per policy.
Run via Cloud Scheduler, GitHub Actions, or cron.
MongoDB: deletes draft reports older than RETENTION_DAYS.
"""
import logging
import os
import time
from datetime import datetime, timedelta

logger = logging.getLogger("retention")

RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "365"))


async def purge_old_data() -> int:
    """
    Delete draft reports older than RETENTION_DAYS.
    Returns number of documents deleted.
    """
    cutoff_ts = time.time() - (RETENTION_DAYS * 24 * 3600)
    try:
        from app.services.db import get_db

        db = get_db()
        result = await db.reports.delete_many(
            {"created_at": {"$lt": cutoff_ts}, "status": "draft"}
        )
        deleted = result.deleted_count
        logger.info(
            "Purged draft reports older than %s days, deleted=%d",
            RETENTION_DAYS,
            deleted,
        )
        return deleted
    except Exception as e:
        logger.exception("Retention purge failed: %s", e)
        return 0


def run_purge_sync() -> int:
    """Synchronous entry point for cron/Cloud Run job."""
    import asyncio

    return asyncio.run(purge_old_data())
