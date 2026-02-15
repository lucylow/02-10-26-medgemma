"""
Compliance test: Mock KMS encrypt/decrypt (Page 6).
"""
import base64
import pytest
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def _mock_kms_key() -> bytes:
    """Dev mock: derive key from fixed salt."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"pediscreen-mock-salt",
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(b"mock-kms-secret"))


def encrypt_mock(plaintext: bytes) -> str:
    """Mock KMS encrypt."""
    f = Fernet(_mock_kms_key())
    return base64.b64encode(f.encrypt(plaintext)).decode("ascii")


def decrypt_mock(cipher_b64: str) -> bytes:
    """Mock KMS decrypt."""
    f = Fernet(_mock_kms_key())
    return f.decrypt(base64.b64decode(cipher_b64))


def test_encrypt_decrypt_roundtrip():
    """Encrypt and decrypt PHI-like data."""
    plain = b"test observations: child says few words"
    cipher = encrypt_mock(plain)
    assert cipher != plain
    dec = decrypt_mock(cipher)
    assert dec == plain


def test_encrypt_deterministic_key():
    """Same key yields consistent decrypt."""
    plain = b"sensitive_data"
    c1 = encrypt_mock(plain)
    c2 = encrypt_mock(plain)
    assert decrypt_mock(c1) == plain
    assert decrypt_mock(c2) == plain
