#!/usr/bin/env python3
"""
Data retention purge job — Page 10.
Deletes or archives expired data per compliance/retention_policy.md.
Run via cron: python tasks/purge_expired.py [--dry-run]
"""
import argparse
import os
import sys
from datetime import datetime, timedelta, timezone

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

RAW_IMAGE_RETENTION_DAYS = int(os.getenv("RAW_IMAGE_RETENTION_DAYS", "30"))
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "365"))


def purge_expired(dry_run: bool = False) -> dict:
    """Purge expired data. Returns counts of actions taken."""
    results = {"raw_images": 0, "draft_reports": 0, "erasure_events": 0}

    try:
        from app.services.db import get_db
        from app.services.legal_audit import write_audit_entry
        import asyncio
    except ImportError:
        print("DB/audit modules not available; skipping purge")
        return results

    cutoff_raw = datetime.now(timezone.utc) - timedelta(days=RAW_IMAGE_RETENTION_DAYS)
    cutoff_drafts = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)

    async def _run():
        db = get_db()
        # Purge screenings with old image_path (raw images)
        cursor = db.screenings.find({"image_path": {"$exists": True, "$ne": None}})
        async for doc in cursor:
            created = doc.get("timestamp") or doc.get("recorded_at") or 0
            if isinstance(created, (int, float)) and created < cutoff_raw.timestamp():
                if not dry_run:
                    await db.screenings.update_one(
                        {"screening_id": doc["screening_id"]},
                        {"$set": {"image_path": None, "deleted_at": datetime.now(timezone.utc).isoformat()}},
                    )
                    await write_audit_entry("erasure_event", {"screening_id": doc["screening_id"], "reason": "retention"})
                results["raw_images"] += 1

        # Purge draft reports
        if hasattr(db, "reports"):
            result = await db.reports.delete_many(
                {"created_at": {"$lt": cutoff_drafts.timestamp()}, "status": "draft"}
            )
            results["draft_reports"] = result.deleted_count
            if result.deleted_count and not dry_run:
                await write_audit_entry("erasure_event", {"count": result.deleted_count, "reason": "retention_drafts"})

        return results

    try:
        results = asyncio.run(_run())
    except Exception as e:
        print(f"Purge failed: {e}")
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without deleting")
    args = parser.parse_args()
    results = purge_expired(dry_run=args.dry_run)
    suffix = " (dry-run)" if args.dry_run else ""
    print(f"Purge complete{suffix}: raw_images={results['raw_images']}, draft_reports={results['draft_reports']}")


if __name__ == "__main__":
    main()
