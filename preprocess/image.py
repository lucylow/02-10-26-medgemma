"""
preprocess/image.py

Image loading & preprocessing utilities.
Small, dependency-light helpers for consistent preprocessing before embedding.
"""

from PIL import Image, ImageOps
import numpy as np
from typing import Tuple


def load_image_rgb(path: str) -> Image.Image:
    """
    Load an image and convert to RGB.

    Args:
        path: path to image file

    Returns:
        PIL.Image in RGB mode
    """
    img = Image.open(path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def resize_and_center_crop(img: Image.Image, size: Tuple[int, int]) -> Image.Image:
    """
    Resize an image with preserving aspect ratio and then center-crop to size.

    Args:
        img: PIL.Image
        size: target (width, height)

    Returns:
        PIL.Image sized to `size`
    """
    target_w, target_h = size
    img.thumbnail((max(target_w, target_h), max(target_w, target_h)), Image.LANCZOS)
    return ImageOps.fit(img, (target_w, target_h), Image.LANCZOS, centering=(0.5, 0.5))


def to_numpy_uint8(img: Image.Image) -> np.ndarray:
    """
    Convert PIL image to HWC uint8 numpy array.

    Returns:
        numpy.ndarray shape (H, W, 3), dtype uint8
    """
    arr = np.array(img)
    if arr.dtype != np.uint8:
        arr = (arr * 255).astype("uint8")
    return arr


def normalize_image_float32(arr_uint8: np.ndarray) -> np.ndarray:
    """
    Normalize uint8 image to dtype float32 in [0,1] and shape (C, H, W) for model processors.

    Returns:
        numpy.ndarray shape (3, H, W), dtype float32
    """
    arr = arr_uint8.astype("float32") / 255.0
    # Move channel first
    arr = np.transpose(arr, (2, 0, 1))
    return arr
