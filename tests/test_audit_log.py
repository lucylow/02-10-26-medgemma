"""Tests for backend.audit append-only JSONL logging."""
import json
import os
import tempfile

import pytest

# Use temp dir for audit in tests
os.environ["AUDIT_LOG_DIR"] = tempfile.mkdtemp()

from backend.audit import input_hash_from_embedding, log_inference


def test_log_inference_creates_file():
    log_inference(
        case_id="audit-test-1",
        adapter_id="pediscreen_v1",
        model_id="google/medgemma-2b-it",
        input_hash="sha256:abc123",
        confidence=0.72,
        status="ok",
    )
    audit_dir = os.environ["AUDIT_LOG_DIR"]
    audit_file = os.path.join(audit_dir, "audit_log.jsonl")
    assert os.path.exists(audit_file)
    with open(audit_file) as f:
        lines = f.readlines()
    assert len(lines) >= 1
    entry = json.loads(lines[-1])
    assert entry["case_id"] == "audit-test-1"
    assert entry["adapter_id"] == "pediscreen_v1"
    assert entry["action"] == "inference"
    assert entry["status"] == "ok"


def test_input_hash_from_embedding():
    h = input_hash_from_embedding("b64data", "obs text")
    assert h.startswith("sha256:")
    assert len(h) == 7 + 64  # sha256: + 64 hex chars
