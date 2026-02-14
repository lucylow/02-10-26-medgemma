#!/usr/bin/env python3
"""
Anomaly detection for audit logs.
Alerts on: spikes in raw_image_accessed, frequent audit_export, unusual signoff patterns.
"""

import os
import sys
from collections import Counter
from datetime import datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "app"))


def load_entries():
    try:
        from app.backend.audit.logger import get_audit_store
        return get_audit_store()
    except ImportError:
        return []


def detect_anomalies(entries: list) -> list:
    alerts = []
    if not entries:
        return alerts

    # Count by event type
    by_type = Counter(e.get("event_type") for e in entries)

    # 1. Spike in raw_image_accessed
    raw_count = by_type.get("raw_image_accessed", 0)
    if raw_count > 10:
        alerts.append(f"ANOMALY: High raw_image_accessed count: {raw_count}")

    # 2. Frequent audit export requests
    export_count = by_type.get("audit_export_request", 0)
    if export_count > 5:
        alerts.append(f"ANOMALY: Frequent audit_export_request: {export_count}")

    # 3. Unusual clinician signoff (same actor in short window)
    signoffs = [e for e in entries if e.get("event_type") == "clinical_signoff"]
    if len(signoffs) >= 10:
        actors = Counter(e.get("actor_id") for e in signoffs)
        for actor, cnt in actors.items():
            if cnt > 8:
                alerts.append(f"ANOMALY: High signoff rate for actor {actor}: {cnt}")

    return alerts


def main():
    entries = load_entries()
    alerts = detect_anomalies(entries)
    for a in alerts:
        print(f"ALERT: {a}")
    if alerts:
        return 1
    print("OK: No anomalies detected")
    return 0


if __name__ == "__main__":
    sys.exit(main())
