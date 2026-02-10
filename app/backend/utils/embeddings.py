"""
Embedding utilities for base64 encoding/decoding
"""

import base64
import numpy as np
from typing import Tuple


def base64_to_float32(b64: str) -> bytes:
    """Decode base64 string to raw bytes"""
    return base64.b64decode(b64)


def base64_to_numpy(b64: str, shape: Tuple[int, ...]) -> np.ndarray:
    """
    Decode base64-encoded float32 array to numpy array with given shape.
    
    Args:
        b64: Base64-encoded string of float32 bytes
        shape: Target shape for the array
        
    Returns:
        numpy array with specified shape
    """
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.float32)
    return arr.reshape(shape)


def numpy_to_base64(arr: np.ndarray) -> str:
    """
    Encode numpy array to base64 string.
    
    Args:
        arr: numpy array (will be converted to float32)
        
    Returns:
        Base64-encoded string
    """
    return base64.b64encode(arr.astype("float32").tobytes()).decode("ascii")


def validate_embedding_shape(shape: Tuple[int, ...], expected_dim: int = 256) -> bool:
    """
    Validate embedding shape.
    
    Args:
        shape: Shape tuple
        expected_dim: Expected embedding dimension
        
    Returns:
        True if valid
    """
    if len(shape) < 1:
        return False
    return shape[-1] == expected_dim
