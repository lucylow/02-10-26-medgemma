"""
HMAC chaining for tamper-evident audit logs.
Each record's HMAC includes the previous record's HMAC.
"""

import hmac as hmac_module
import hashlib
import json
from typing import Optional, Dict, Any, List


def compute_hmac(prev_hmac: Optional[str], entry_json: Dict[str, Any], key: bytes) -> str:
    """
    Compute HMAC-SHA256 of this record for chain integrity.
    HMAC is over: prev_hmac + sorted JSON of entry (excluding hmac field).
    """
    # Exclude hmac from computation (it's the output)
    entry_copy = {k: v for k, v in entry_json.items() if k != "hmac"}
    data = (prev_hmac or "") + json.dumps(entry_copy, sort_keys=True)
    return hmac_module.new(key, data.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_chain(entries: List[Dict[str, Any]], key: bytes) -> tuple[bool, Optional[str]]:
    """
    Verify HMAC chain integrity.
    Returns (ok, error_message).
    """
    prev_hmac = None
    for i, entry in enumerate(entries):
        stored_hmac = entry.get("hmac")
        if not stored_hmac:
            return False, f"Entry {i} missing hmac field"
        expected = compute_hmac(prev_hmac, entry, key)
        if stored_hmac != expected:
            return False, f"Entry {i} HMAC mismatch: expected {expected[:16]}..., got {stored_hmac[:16]}..."
        prev_hmac = stored_hmac
    return True, None
