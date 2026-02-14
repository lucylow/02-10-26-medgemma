"""
PDF PKI digital signatures for cryptographic document integrity.
Signs PDF hash with RSA private key; allows verification later.
"""
import os
from typing import Optional, Tuple

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from app.services.pdf_signing import hash_pdf
from app.core.logger import logger

# Demo CA label (production: use proper PKI)
SIGNING_CERT_LABEL = os.getenv("PDF_SIGNING_CERT_LABEL", "PediScreen AI Demo CA")


def sign_pdf_hash(pdf_hash: str, private_key_pem: bytes) -> str:
    """
    Sign a PDF hash with RSA private key.
    Returns hex-encoded signature for storage and verification.

    Args:
        pdf_hash: SHA-256 hex digest of PDF content
        private_key_pem: PEM-encoded RSA private key

    Returns:
        Hex-encoded signature string
    """
    private_key = serialization.load_pem_private_key(
        private_key_pem,
        password=None,
    )
    signature = private_key.sign(
        pdf_hash.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    return signature.hex()


def verify_pdf_signature(pdf_hash: str, signature_hex: str, public_key_pem: bytes) -> bool:
    """
    Verify a PDF signature against the hash and public key.
    """
    from cryptography.hazmat.primitives.asymmetric import padding as asym_padding

    public_key = serialization.load_pem_public_key(public_key_pem)
    signature = bytes.fromhex(signature_hex)
    try:
        public_key.verify(
            signature,
            pdf_hash.encode("utf-8"),
            asym_padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False


def get_signing_key() -> Optional[bytes]:
    """
    Load private key from environment.
    Set PDF_SIGNING_PRIVATE_KEY_PEM or PDF_SIGNING_PRIVATE_KEY_PATH.
    """
    pem = os.getenv("PDF_SIGNING_PRIVATE_KEY_PEM")
    if pem:
        return pem.encode("utf-8") if isinstance(pem, str) else pem

    path = os.getenv("PDF_SIGNING_PRIVATE_KEY_PATH")
    if path and os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()

    return None


def sign_pdf_if_configured(pdf_bytes: bytes) -> Tuple[Optional[str], Optional[str]]:
    """
    Sign PDF if PKI is configured. Returns (signature_hex, signing_cert_label) or (None, None).
    """
    key = get_signing_key()
    if not key:
        return None, None

    try:
        content_hash = hash_pdf(pdf_bytes)
        signature = sign_pdf_hash(content_hash, key)
        return signature, SIGNING_CERT_LABEL
    except Exception as e:
        logger.warning("PDF PKI signing failed: %s", e)
        return None, None
