# backend/app/services/dicom_ingest.py
"""
DICOM ingestion: load DICOM bytes, apply windowing, convert to PNG for MedSigLIP/MedGemma.
Handles CT/X-ray safely; no lossy preprocessing tricks.
"""
import io
from typing import Optional

import numpy as np
from PIL import Image

try:
    import pydicom
    _HAS_PYDICOM = True
except ImportError:
    _HAS_PYDICOM = False


def dicom_to_png_bytes(dicom_bytes: bytes) -> bytes:
    """
    Convert DICOM pixel data to PNG bytes for vision model consumption.
    Applies windowing when available (CT/X-ray); normalizes to 0–255.
    """
    if not _HAS_PYDICOM:
        raise ImportError("pydicom is required for DICOM ingestion. pip install pydicom")

    ds = pydicom.dcmread(io.BytesIO(dicom_bytes))

    pixel_array = ds.pixel_array.astype(float)

    # Windowing (safe default)
    if hasattr(ds, "WindowCenter") and hasattr(ds, "WindowWidth"):
        center = float(ds.WindowCenter[0] if hasattr(ds.WindowCenter, "__len__") else ds.WindowCenter)
        width = float(ds.WindowWidth[0] if hasattr(ds.WindowWidth, "__len__") else ds.WindowWidth)
        min_val = center - width / 2
        max_val = center + width / 2
        pixel_array = np.clip(pixel_array, min_val, max_val)

    # Normalize to 0–255
    pixel_array -= pixel_array.min()
    pixel_array /= pixel_array.max() + 1e-6
    pixel_array *= 255.0

    img = Image.fromarray(pixel_array.astype(np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def is_dicom(filename: str) -> bool:
    """Check if filename suggests DICOM format."""
    return filename.lower().endswith(".dcm") or filename.lower().endswith(".dicom")
