#!/usr/bin/env python3
"""
Mock key rotation script for dev/testing.
Rotates AUDIT_HMAC_KEY and updates encrypted test data (placeholder).
"""

import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, ROOT)

def main():
    old_key = os.getenv("AUDIT_HMAC_KEY", "dev-audit-hmac-key-change-in-prod")
    new_key = "rotated-" + old_key[:8] + "-" + str(int(os.urandom(4).hex(), 16))
    print(f"Mock rotation: old_key -> new_key")
    print(f"  Set AUDIT_HMAC_KEY={new_key} in environment")
    print("  In production: use KMS key version rotation")
    return 0


if __name__ == "__main__":
    sys.exit(main())
