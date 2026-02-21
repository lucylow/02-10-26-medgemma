"""
HIPAA-grade PHI envelope encryption.

Uses Fernet (symmetric) with key from PHI_ENCRYPTION_KEY.
In production: use KMS envelope encryption (e.g. AWS KMS, GCP KMS) and store
only the encrypted data key with the blob; PHI_ENCRYPTION_KEY then becomes
the KMS key ID or a key derived from KMS.
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

logger = __import__("logging").getLogger("phi_encryption")


def _get_fernet() -> Fernet:
    key_env = os.environ.get("PHI_ENCRYPTION_KEY")
    if key_env and len(key_env) >= 44:
        # Raw Fernet key (urlsafe_b64encode(32 bytes) -> 44 chars)
        try:
            return Fernet(key_env.encode("ascii") if isinstance(key_env, str) else key_env)
        except Exception:
            pass
    if key_env and len(key_env) >= 16:
        # Use as password for key derivation (dev/test)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"pediscreen_phi_v1",
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(key_env.encode("utf-8")))
        return Fernet(key)
    # Dev fallback (NOT for production)
    if os.environ.get("ALLOW_DEV_PHI_KEY") == "1":
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"pediscreen_phi_dev_only",
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(b"dev_only_change_in_production"))
        return Fernet(key)
    raise RuntimeError(
        "PHI_ENCRYPTION_KEY must be set (or ALLOW_DEV_PHI_KEY=1 for dev only). "
        "Use Fernet.generate_key() or KMS for production."
    )


def encrypt_phi(data: Dict[str, Any]) -> bytes:
    """Serialize and encrypt a PHI dict. Returns ciphertext bytes."""
    fernet = _get_fernet()
    return fernet.encrypt(json.dumps(data, default=str).encode("utf-8"))


def decrypt_phi(blob: bytes) -> Dict[str, Any]:
    """Decrypt and deserialize PHI. Raises InvalidToken if tampered or wrong key."""
    fernet = _get_fernet()
    try:
        return json.loads(fernet.decrypt(blob).decode("utf-8"))
    except InvalidToken as e:
        logger.warning("PHI decrypt failed: invalid token or key")
        raise ValueError("Invalid or tampered PHI blob") from e
