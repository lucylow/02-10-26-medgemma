"""
Compliance test: Audit log HMAC integrity (Page 8).
"""
import hashlib
import hmac
import json
import pytest


def compute_hmac_root(entries, key: bytes) -> str:
    """Compute root HMAC of audit log chain."""
    prev = None
    for e in entries:
        payload = json.dumps({k: e.get(k) for k in sorted(e) if k != "hmac"}, sort_keys=True).encode()
        if prev:
            payload = prev.encode() + b":" + payload
        prev = hmac.new(key, payload, hashlib.sha256).hexdigest()
    return prev or ""


def test_audit_hmac_chain():
    """HMAC chain verifies integrity."""
    key = b"test-audit-key"
    entries = [
        {"event_id": "e1", "event_type": "inference_run", "ts": "2026-02-14T12:00:00Z"},
        {"event_id": "e2", "event_type": "consent_created", "ts": "2026-02-14T12:01:00Z"},
    ]
    root = compute_hmac_root(entries, key)
    assert len(root) == 64
    assert root == compute_hmac_root(entries, key)  # deterministic


def test_audit_tamper_detection():
    """Modified entry changes HMAC root."""
    key = b"test-audit-key"
    entries = [{"event_id": "e1", "event_type": "inference_run"}]
    root1 = compute_hmac_root(entries, key)
    entries[0]["event_type"] = "tampered"
    root2 = compute_hmac_root(entries, key)
    assert root1 != root2
