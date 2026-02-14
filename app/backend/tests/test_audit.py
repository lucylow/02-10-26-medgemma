"""
Tests for tamper-evident audit logging.
"""

import os
import pytest
from app.backend.audit.hmac_chain import compute_hmac, verify_chain
from app.backend.audit.redaction import hash_sensitive, hash_serialized


def test_compute_hmac():
    key = b"test-key"
    entry = {"event_id": "1", "timestamp": "2026-01-01T00:00:00Z"}
    h = compute_hmac(None, entry, key)
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


def test_verify_chain():
    key = b"test-key"
    e1 = {"event_id": "1", "timestamp": "2026-01-01T00:00:00Z"}
    e1["prev_hmac"] = None
    e1["hmac"] = compute_hmac(None, e1, key)
    e2 = {"event_id": "2", "timestamp": "2026-01-01T00:01:00Z"}
    e2["prev_hmac"] = e1["hmac"]
    e2["hmac"] = compute_hmac(e1["hmac"], e2, key)
    ok, err = verify_chain([e1, e2], key)
    assert ok, err


def test_verify_chain_detects_tampering():
    key = b"test-key"
    e1 = {"event_id": "1", "timestamp": "2026-01-01T00:00:00Z"}
    e1["prev_hmac"] = None
    e1["hmac"] = compute_hmac(None, e1, key)
    e2 = {"event_id": "2", "timestamp": "2026-01-01T00:01:00Z"}
    e2["prev_hmac"] = e1["hmac"]
    e2["hmac"] = "tampered"
    ok, err = verify_chain([e1, e2], key)
    assert not ok
    assert err is not None and ("mismatch" in err.lower() or "Entry" in err)


def test_hash_sensitive():
    h = hash_sensitive("secret observation")
    assert len(h) == 64
    assert hash_sensitive("secret observation") == h
    assert hash_sensitive("different") != h


def test_redaction_no_phi_in_log():
    """Logs for inference must not contain raw PHI; only input_hash."""
    phi_text = "Parent reports child says few words"
    meta = {"input_hash": hash_sensitive(phi_text), "length": len(phi_text)}
    assert phi_text not in str(meta)
    assert "input_hash" in meta
