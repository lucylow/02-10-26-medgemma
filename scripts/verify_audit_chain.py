#!/usr/bin/env python3
"""
Verify HMAC chain integrity of audit logs.
Usage:
  python scripts/verify_audit_chain.py
  python scripts/verify_audit_chain.py --fixtures compliance/fixtures/audit_sample.json
  python scripts/verify_audit_chain.py --fixtures compliance/fixtures/audit_fixture.json
"""

import argparse
import json
import os
import sys

# Add project root to path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, ROOT)

# Try app.backend.audit for main app
try:
    from app.backend.audit.hmac_chain import compute_hmac, verify_chain
except ImportError:
    # Fallback for backend/ layout
    sys.path.insert(0, os.path.join(ROOT, "app", "backend"))
    from audit.hmac_chain import compute_hmac, verify_chain


def load_fixture(path: str) -> tuple[list, bytes]:
    """Load fixture file. Expects JSON array or {entries: [], key: "base64"}."""
    with open(path, "r") as f:
        data = json.load(f)
    if isinstance(data, list):
        entries = data
        key = os.getenv("AUDIT_HMAC_KEY", "dev-audit-hmac-key-change-in-prod").encode("utf-8")
    else:
        entries = data.get("entries", data.get("audit_log", []))
        key_b64 = data.get("key")
        if key_b64:
            import base64
            key = base64.b64decode(key_b64)
        else:
            key = os.getenv("AUDIT_HMAC_KEY", "dev-audit-hmac-key-change-in-prod").encode("utf-8")
    return entries, key


def fill_placeholder_hmacs(entries: list, key: bytes) -> None:
    """Replace placeholder HMACs with computed values (in-place)."""
    prev_hmac = None
    for e in entries:
        if e.get("hmac", "").startswith("PLACEHOLDER") or not e.get("hmac"):
            e["prev_hmac"] = prev_hmac
            hmac_val = compute_hmac(prev_hmac, e, key)
            e["hmac"] = hmac_val
            prev_hmac = hmac_val
        else:
            prev_hmac = e.get("hmac")


def main():
    parser = argparse.ArgumentParser(description="Verify audit log HMAC chain")
    parser.add_argument(
        "--fixtures",
        default=None,
        help="Path to JSON fixture (array of audit entries or {entries, key})",
    )
    parser.add_argument("--key", default=None, help="Override HMAC key (dev only)")
    args = parser.parse_args()

    if args.fixtures:
        path = args.fixtures
        if not os.path.isabs(path):
            path = os.path.join(ROOT, path)
        if not os.path.exists(path):
            print(f"ERROR: Fixture not found: {path}")
            sys.exit(1)
        entries, key = load_fixture(path)
    else:
        # Use in-memory store from running app (or empty)
        try:
            from app.backend.audit.logger import get_audit_store, get_hmac_key
            entries = get_audit_store()
            key = get_hmac_key()
        except ImportError:
            # Default: use compliance fixture if exists
            default_fixture = os.path.join(ROOT, "compliance", "fixtures", "audit_sample.json")
            if os.path.exists(default_fixture):
                entries, key = load_fixture(default_fixture)
            else:
                print("No fixture specified and no in-memory store. Use --fixtures path.")
                sys.exit(1)

    if args.key:
        key = args.key.encode("utf-8")

    # Fill placeholder HMACs if present
    fill_placeholder_hmacs(entries, key)

    if not entries:
        print("OK (empty chain)")
        sys.exit(0)

    ok, err = verify_chain(entries, key)
    if ok:
        print(f"OK: Chain verified ({len(entries)} entries)")
        sys.exit(0)
    else:
        print(f"FAIL: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
