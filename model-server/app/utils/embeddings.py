"""
Centralized embedding contract parsing for MedGemma/HAI-DEF.
Validates base64 content length matches float32 size; provides robust decode/reshape.
"""
import base64
from typing import Sequence

import numpy as np


def parse_embedding_b64(b64: str, shape: Sequence[int]) -> np.ndarray:
    """
    Parse base64-encoded float32 embedding bytes into numpy array with given shape.

    Validates that raw byte length matches expected float32 size (shape prod * 4).
    Raises ValueError with helpful message if mismatch.

    Args:
        b64: Base64-encoded string of float32 bytes
        shape: Target shape for the array (e.g. [1, 256])

    Returns:
        np.ndarray with dtype float32 and given shape

    Raises:
        ValueError: If byte length does not match expected size for shape
    """
    raw = base64.b64decode(b64)
    expected = int(np.prod(shape) * 4)
    if len(raw) != expected:
        raise ValueError(
            f"Embedding bytes length mismatch: expected {expected} bytes for shape {shape}, got {len(raw)}"
        )
    arr = np.frombuffer(raw, dtype=np.float32).reshape(tuple(shape))
    return np.asarray(arr, dtype=np.float32)
