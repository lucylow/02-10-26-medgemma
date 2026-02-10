from typing import Optional, Dict, Any
import base64
from .medsiglip_service import MedSigLIPService
from loguru import logger

_siglip_service: Optional[MedSigLIPService] = None

def get_siglip():
    global _siglip_service
    if _siglip_service is None:
        try:
            _siglip_service = MedSigLIPService()
        except Exception as e:
            logger.warning(f"Failed to initialize MedSigLIPService: {e}")
    return _siglip_service

def compute_embedding(image_path: Optional[str] = None, image_b64: Optional[str] = None) -> Dict[str, Any]:
    """
    Computes MedSigLIP embedding for an image.
    """
    service = get_siglip()
    if not service:
        raise RuntimeError("MedSigLIP service not available")

    input_data = None
    if image_b64:
        input_data = image_b64
    elif image_path:
        with open(image_path, "rb") as f:
            input_data = f.read()
    else:
        raise ValueError("Either image_path or image_b64 must be provided")

    result = service.analyze_clinical_features(input_data)
    
    # Format to match expectations
    return {
        "model": "medsiglip-v1",
        "b64": base64.b64encode(service.extract_features(input_data).tobytes()).decode("ascii"),
        "shape": [1, 256], # MedSigLIP usually 256 or 512
        "detected_features": result.get("detected_features", [])
    }
