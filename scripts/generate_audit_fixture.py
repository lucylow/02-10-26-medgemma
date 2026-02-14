#!/usr/bin/env python3
"""
Generate audit fixture with valid HMAC chain for CI/testing.
"""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, ROOT)

from app.backend.audit.hmac_chain import compute_hmac

KEY = b"dev-audit-hmac-key-change-in-prod"

ENTRIES = [
    {
        "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1111111111",
        "event_type": "inference_run",
        "actor_id": "clinician-demo-1",
        "actor_role": "clinician",
        "resource_type": "case",
        "resource_id": "case-001",
        "timestamp": "2026-02-14T10:00:00.000Z",
        "request": {
            "prompt_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "input_hash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
            "adapter_id": "pediscreen_v1",
            "model_id": "google/medgemma-2b-it",
            "input_meta": {"age_months": 24, "obs_length": 32},
        },
        "response": {
            "summary_hash": "f1e2d3c4b5a6978890a1b2c3d4e5f6789012345678901234567890abcdef12",
            "risk": "monitor",
            "confidence": 0.72,
            "explainability_refs": ["nn:case-001-123"],
        },
        "outcome": "queued_for_review",
        "client_ip": "192.168.1.1",
        "request_id": "trace-abc-123",
    },
    {
        "event_id": "b2c3d4e5-f6a7-8901-bcde-f22222222222",
        "event_type": "clinical_signoff",
        "actor_id": "clinician-demo-1",
        "actor_role": "clinician",
        "resource_type": "screening",
        "resource_id": "screen-001",
        "timestamp": "2026-02-14T10:05:00.000Z",
        "outcome": "signed_off",
        "client_ip": "192.168.1.1",
    },
]


def main():
    prev_hmac = None
    for e in ENTRIES:
        e["prev_hmac"] = prev_hmac
        hmac_val = compute_hmac(prev_hmac, e, KEY)
        e["hmac"] = hmac_val
        prev_hmac = hmac_val

    out_path = os.path.join(ROOT, "compliance", "fixtures", "audit_fixture.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(ENTRIES, f, indent=2)
    print(f"Wrote {out_path} with {len(ENTRIES)} entries")


if __name__ == "__main__":
    main()
