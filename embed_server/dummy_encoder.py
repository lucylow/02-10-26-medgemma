"""Dummy encoder for CI and quick demos when real model is not loaded."""
import base64
import numpy as np


def dummy_embedding():
    arr = np.ones((1, 256), dtype="float32")
    return base64.b64encode(arr.tobytes()).decode()
