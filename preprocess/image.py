"""
Image preprocessing for MedSigLIP / vision encoders.

Resize, normalize, optional augmentations. CPU-friendly.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple

import numpy as np
from PIL import Image


def load_rgb(path: str | Path) -> Image.Image:
    """Load image as RGB PIL Image."""
    return Image.open(path).convert("RGB")


def resize_to(
    image: Image.Image,
    size: Tuple[int, int] = (224, 224),
    resample: int = Image.BILINEAR,
) -> Image.Image:
    """Resize image to (height, width)."""
    return image.resize((size[1], size[0]), resample=resample)


def center_crop_to(image: Image.Image, size: Tuple[int, int] = (224, 224)) -> Image.Image:
    """Center crop to (height, width)."""
    w, h = image.size
    target_h, target_w = size
    if w < target_w or h < target_h:
        return resize_to(image, size)
    left = (w - target_w) // 2
    top = (h - target_h) // 2
    return image.crop((left, top, left + target_w, top + target_h))


def preprocess_for_encoder(
    path: str | Path,
    size: Tuple[int, int] = (224, 224),
    center_crop: bool = True,
) -> Image.Image:
    """Load, optionally center-crop, and resize for encoder input."""
    img = load_rgb(path)
    if center_crop:
        img = center_crop_to(img, size)
    else:
        img = resize_to(img, size)
    return img
