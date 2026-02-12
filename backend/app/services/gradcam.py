# backend/app/services/gradcam.py
"""
Model-agnostic Grad-CAM style heatmap generation for explainability.
Produces visual evidence overlays for clinician review — non-diagnostic.
"""
from typing import Optional

import numpy as np

try:
    import cv2
    _HAS_CV2 = True
except ImportError:
    _HAS_CV2 = False


def _synthetic_activation_map(height: int, width: int) -> np.ndarray:
    """
    Placeholder activation map when vision model doesn't provide one.
    Center-weighted gradient for demo/fallback.
    """
    y, x = np.ogrid[:height, :width]
    cy, cx = height / 2, width / 2
    dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    max_dist = np.sqrt(cy**2 + cx**2)
    act = 1.0 - np.clip(dist / (max_dist + 1e-6), 0, 1)
    return act


def generate_gradcam(
    image_bytes: bytes,
    activation_map: Optional[np.ndarray] = None,
) -> bytes:
    """
    Generate Grad-CAM style heatmap overlay on image.
    Returns PNG bytes for storage/display.

    Args:
        image_bytes: Raw image bytes (PNG/JPEG)
        activation_map: Optional 2D numpy array from vision model.
                        If None, uses synthetic center-weighted map.
    """
    if not _HAS_CV2:
        raise ImportError("opencv-python is required for Grad-CAM. pip install opencv-python")

    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Could not decode image")

    h, w = img.shape[:2]

    if activation_map is None:
        act = _synthetic_activation_map(h, w)
    else:
        act = activation_map.astype(np.float64)
        if act.ndim != 2:
            act = act.squeeze()
        if act.ndim != 2:
            raise ValueError("activation_map must be 2D")
        act = cv2.resize(act, (w, h))

    # ReLU, normalize
    heatmap = np.maximum(act, 0)
    heatmap /= heatmap.max() + 1e-6
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

    img_bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    overlay = cv2.addWeighted(img_bgr, 0.6, heatmap, 0.4, 0)

    _, buf = cv2.imencode(".png", overlay)
    return buf.tobytes()
