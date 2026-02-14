#!/usr/bin/env python3
"""Run retention purge. Use: RETENTION_DAYS=90 python -m app.scripts.run_retention"""
import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.services.retention import purge_old_data


def main():
    deleted = asyncio.run(purge_old_data())
    print(f"Purged {deleted} draft reports")
    return 0


if __name__ == "__main__":
    sys.exit(main())
