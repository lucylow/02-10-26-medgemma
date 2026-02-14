"""
PDF hash signing for tamper detection.
Reports are cryptographically verifiable and tamper-evident.
"""

import hashlib

PDF_HASH_PLACEHOLDER = "0" * 64  # 64 chars for SHA-256 hex


def hash_pdf(pdf_bytes: bytes) -> str:
    """Compute SHA-256 hash of PDF bytes for tamper detection."""
    return hashlib.sha256(pdf_bytes).hexdigest()


def embed_hash_in_pdf(pdf_bytes: bytes, content_hash: str) -> bytes:
    """
    Replace the 64-char placeholder in PDF with the actual content hash.
    Use content_hash (hash of PDF before replacement) for human-readable footer.
    Returns the final PDF; caller should store hash_pdf(result) for verification.
    """
    placeholder = PDF_HASH_PLACEHOLDER.encode("utf-8")
    replacement = content_hash.encode("utf-8")
    if placeholder in pdf_bytes:
        return pdf_bytes.replace(placeholder, replacement, 1)
    return pdf_bytes
