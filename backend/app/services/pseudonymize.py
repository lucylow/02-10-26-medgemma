"""
Pseudonymization utilities — Page 5.
Server-side pepper + SHA256 for user identifiers.
"""
import hashlib
import os


def _get_pepper() -> str:
    """Server-side pepper from env (KMS/Secret Manager in prod)."""
    return os.getenv("PSEUDONYM_PEPPER", "dev-pepper-change-in-prod")


def pseudonymize_user(user_email: str, pepper: str | None = None) -> str:
    """
    One-way pseudonymization. Do not store email/name; store only this hash.
    pepper: server-side secret (from KMS in prod).
    """
    p = pepper or _get_pepper()
    s = (user_email + p).encode("utf-8")
    return hashlib.sha256(s).hexdigest()


def pseudonymize_id(identifier: str, pepper: str | None = None) -> str:
    """Generic identifier pseudonymization."""
    return pseudonymize_user(identifier, pepper)
