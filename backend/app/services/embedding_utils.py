"""
Canonical embedding encode/decode utilities for MedSigLIP.
Embeddings must be float32, L2-normalized; base64 encoded as raw bytes.
"""
import base64
from typing import List, Tuple, Union

import numpy as np


def float32_arr_to_b64(arr: np.ndarray) -> str:
    """Encode float32 numpy array to base64 string (raw bytes, no text serialization)."""
    return base64.b64encode(arr.astype(np.float32).tobytes()).decode("ascii")


def b64_to_float32_arr(b64: str, shape: List[int]) -> np.ndarray:
    """Decode base64 string to float32 numpy array with given shape."""
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.float32)
    return arr.reshape(shape)


def normalize_l2(arr: np.ndarray, axis: int = -1) -> np.ndarray:
    """L2-normalize array along axis. Returns normalized copy."""
    arr = np.asarray(arr, dtype=np.float32)
    norm = np.linalg.norm(arr, axis=axis, keepdims=True)
    norm = np.where(norm < 1e-12, 1.0, norm)
    return (arr / norm).astype(np.float32)


def list_to_b64(embedding: List[float], shape: List[int] = None) -> Tuple[str, List[int]]:
    """
    Convert list of floats to base64-encoded float32 bytes.
    Returns (b64_string, shape).
    """
    arr = np.array(embedding, dtype=np.float32)
    if shape:
        arr = arr.reshape(shape)
    else:
        shape = list(arr.shape)
    arr = normalize_l2(arr)
    return float32_arr_to_b64(arr), shape


def b64_to_list(b64: str, shape: List[int]) -> List[float]:
    """Decode base64 embedding to list of floats."""
    arr = b64_to_float32_arr(b64, shape)
    return arr.tolist()
