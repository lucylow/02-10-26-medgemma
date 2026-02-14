"""
PHI minimization: hash sensitive data before logging.
Never log raw observations, images, or PII.
"""

import hashlib
import json
from typing import Any, Dict


def hash_sensitive(s: str) -> str:
    """SHA256 hash of string - use for observations, prompts, etc."""
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def hash_serialized(obj: Any) -> str:
    """SHA256 of JSON-serialized object (sorted keys for determinism)."""
    data = json.dumps(obj, sort_keys=True, default=str)
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def redact_for_log(text: str, max_len: int = 0) -> Dict[str, Any]:
    """
    Redact free-text: never log raw. Return hash + metadata only.
    """
    return {
        "input_hash": hash_sensitive(text),
        "length": len(text),
        "token_count_approx": len(text.split()) if text else 0,
    }
