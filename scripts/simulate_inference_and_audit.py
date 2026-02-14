#!/usr/bin/env python3
"""
Simulate inference calls and verify audit logs are written.
Run against a live server or in-process.
"""

import os
import sys
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "app"))


def main():
    # Option 1: Call audit logger directly (no server)
    try:
        from app.backend.audit import audit_logger
        from app.backend.audit.schema import AuditRequestMeta, AuditResponseMeta
        from app.backend.audit.logger import get_audit_store
        from app.backend.audit.redaction import hash_sensitive, hash_serialized
    except ImportError as e:
        print(f"Import error: {e}")
        return 1

    # Simulate 3 inference audit entries
    for i in range(3):
        request_meta = AuditRequestMeta(
            prompt_hash=hash_sensitive(f"prompt-{i}"),
            input_hash=hash_serialized({"age_months": 24, "obs_length": 10}),
            adapter_id="pediscreen_v1",
            model_id="google/medgemma-2b-it",
            input_meta={"age_months": 24, "obs_length": 10},
        )
        response_meta = AuditResponseMeta(
            summary_hash=hash_sensitive(f"summary-{i}"),
            risk="monitor",
            confidence=0.7 + i * 0.05,
            inference_id=f"screen-{i}",
        )
        audit_logger(
            event_type="inference_run",
            actor_id="simulator",
            actor_role="chworker",
            resource_id=f"case-{i}",
            request_meta=request_meta,
            response_meta=response_meta,
            outcome="queued_for_review",
        )

    entries = get_audit_store()
    print(f"Logged {len(entries)} audit entries")

    # Verify chain
    from app.backend.audit.hmac_chain import verify_chain
    from app.backend.audit.logger import get_hmac_key
    ok, err = verify_chain(entries, get_hmac_key())
    if ok:
        print("OK: Chain verified")
        return 0
    else:
        print(f"FAIL: {err}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
