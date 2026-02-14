"""
Unit tests for embedding parsing (parse_embedding_b64).
"""
import base64

import numpy as np
import pytest

from app.utils.embeddings import parse_embedding_b64


def test_parse_embedding_b64_valid():
    """Valid base64 + shape -> correct np array."""
    shape = [1, 256]
    arr = np.random.randn(*shape).astype(np.float32)
    b64 = base64.b64encode(arr.tobytes()).decode("ascii")
    result = parse_embedding_b64(b64, shape)
    np.testing.assert_array_almost_equal(result, arr)
    assert result.shape == tuple(shape)
    assert result.dtype == np.float32


def test_parse_embedding_b64_shape_2_512():
    """Test different shape [2, 512]."""
    shape = [2, 512]
    arr = np.random.randn(*shape).astype(np.float32)
    b64 = base64.b64encode(arr.tobytes()).decode("ascii")
    result = parse_embedding_b64(b64, shape)
    np.testing.assert_array_almost_equal(result, arr)
    assert result.shape == (2, 512)


def test_parse_embedding_b64_invalid_shape_raises():
    """Invalid shape (wrong byte length) -> raises ValueError with message."""
    # 256 floats = 1024 bytes; provide 128 floats = 512 bytes
    shape = [1, 256]  # expects 1024 bytes
    raw = np.random.randn(128).astype(np.float32).tobytes()  # 512 bytes
    b64 = base64.b64encode(raw).decode("ascii")
    with pytest.raises(ValueError) as exc_info:
        parse_embedding_b64(b64, shape)
    assert "expected 1024 bytes" in str(exc_info.value)
    assert "got 512" in str(exc_info.value)


def test_parse_embedding_b64_too_many_bytes_raises():
    """Too many bytes for shape -> raises ValueError."""
    shape = [1, 256]  # expects 1024 bytes
    raw = np.random.randn(300).astype(np.float32).tobytes()  # 1200 bytes
    b64 = base64.b64encode(raw).decode("ascii")
    with pytest.raises(ValueError) as exc_info:
        parse_embedding_b64(b64, shape)
    assert "expected 1024 bytes" in str(exc_info.value)
    assert "got 1200" in str(exc_info.value)


def test_parse_embedding_b64_invalid_base64_raises():
    """Invalid base64 string -> raises (base64.b64decode raises)."""
    with pytest.raises(Exception):  # binascii.Error or similar
        parse_embedding_b64("not-valid-base64!!!", [1, 256])
