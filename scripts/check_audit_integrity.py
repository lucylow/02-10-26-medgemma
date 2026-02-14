#!/usr/bin/env python3
"""CI check: verify audit chain integrity on fixtures."""

import os
import sys
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "app"))


def main():
    fixture = os.path.join(ROOT, "compliance", "fixtures", "audit_sample.json")
    if not os.path.exists(fixture):
        print("SKIP: No audit fixture")
        return 0
    try:
        from app.backend.audit.hmac_chain import verify_chain, compute_hmac
    except ImportError:
        print("ERROR: Cannot import audit module")
        return 1
    with open(fixture) as f:
        entries = json.load(f)
    key = os.getenv("AUDIT_HMAC_KEY", "dev-audit-hmac-key-change-in-prod").encode("utf-8")
    prev_hmac = None
    for e in entries:
        if e.get("hmac", "").startswith("PLACEHOLDER") or not e.get("hmac"):
            e["prev_hmac"] = prev_hmac
            e["hmac"] = compute_hmac(prev_hmac, e, key)
        prev_hmac = e.get("hmac")
    ok, err = verify_chain(entries, key)
    if ok:
        print(f"OK: Audit chain verified ({len(entries)} entries)")
        return 0
    print(f"FAIL: {err}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
