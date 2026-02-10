"""
MedBLIPService
- loads MedBLIP vision model
- extracts clinical feature embeddings from images
- provides clinical report generation based on image-text pairs
"""

import os
import base64
import io
from typing import Optional, Union, Dict, Any, List

import numpy as np
import torch
from PIL import Image
from loguru import logger
from transformers import AutoProcessor, Blip2ForConditionalGeneration

# Environment-driven defaults
# Using a common MedBLIP variant or a base BLIP-2 that can be adapted
MEDBLIP_MODEL_NAME = os.getenv("MEDBLIP_MODEL_NAME", "Salesforce/blip2-opt-2.7b")
DEVICE_AUTO = os.getenv("DEVICE_AUTO", "1") == "1"

class MedBLIPService:
    def __init__(
        self,
        model_name: str = MEDBLIP_MODEL_NAME,
        device: Optional[str] = None
    ):
        self.model_name = model_name
        
        # choose device
        if device:
            self.device = torch.device(device)
        else:
            self.device = torch.device(
                "cuda" if (torch.cuda.is_available() and DEVICE_AUTO) else "cpu"
            )
        logger.info("MedBLIPService device: {}", self.device)
        
        # load components
        self.processor = None
        self.model = None
        self._load_model()

    def _load_model(self):
        logger.info("Loading MedBLIP model: {}", self.model_name)
        try:
            self.processor = AutoProcessor.from_pretrained(self.model_name)
            # Use float16 on GPU for memory efficiency
            torch_dtype = torch.float16 if "cuda" in str(self.device) else torch.float32
            self.model = Blip2ForConditionalGeneration.from_pretrained(
                self.model_name, 
                torch_dtype=torch_dtype
            ).to(self.device)
            self.model.eval()
            logger.info("MedBLIP model loaded successfully")
        except Exception as e:
            logger.error("Failed to load MedBLIP model: {}", e)
            # Fallback to a placeholder or simpler model in a real scenario
            self.model = None
            self.processor = None

    def preprocess_image(self, image_input: Union[str, Image.Image, bytes]) -> Image.Image:
        """
        Convert various input formats to PIL Image.
        """
        try:
            if isinstance(image_input, Image.Image):
                return image_input
            
            if isinstance(image_input, str):
                # Handle base64
                if "," in image_input:
                    image_input = image_input.split(",")[1]
                try:
                    img_bytes = base64.b64decode(image_input)
                except Exception as e:
                    logger.error("MedBLIP: Failed to decode base64 image: {}", e)
                    raise ValueError(f"Invalid base64 encoding: {str(e)}")
                
                try:
                    return Image.open(io.BytesIO(img_bytes)).convert("RGB")
                except Exception as e:
                    logger.error("MedBLIP: Failed to open image from bytes: {}", e)
                    raise ValueError(f"Invalid image data: {str(e)}")
            
            if isinstance(image_input, bytes):
                try:
                    return Image.open(io.BytesIO(image_input)).convert("RGB")
                except Exception as e:
                    logger.error("MedBLIP: Failed to open image from raw bytes: {}", e)
                    raise ValueError(f"Invalid image bytes: {str(e)}")
            
            raise ValueError(f"Unsupported image input type: {type(image_input)}")
        except Exception as e:
            if not isinstance(e, ValueError):
                logger.exception("MedBLIP: Unexpected error during image preprocessing")
            raise

    def generate_report(self, image_input: Union[str, Image.Image, bytes], prompt: str = "Question: What clinical features are visible in this developmental screening image? Answer:") -> str:
        """
        Generate a clinical description or report from an image.
        """
        if self.model is None or self.processor is None:
            raise RuntimeError("MedBLIP model not loaded")

        image = self.preprocess_image(image_input)
        
        inputs = self.processor(images=image, text=prompt, return_tensors="pt").to(self.device, torch.float16 if "cuda" in str(self.device) else torch.float32)
        
        with torch.no_grad():
            generated_ids = self.model.generate(**inputs, max_new_tokens=50)
            generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
        
        return generated_text

    def extract_features(self, image_input: Union[str, Image.Image, bytes]) -> np.ndarray:
        """
        Extract feature embeddings from an image using the vision model part of BLIP-2.
        """
        if self.model is None or self.processor is None:
            raise RuntimeError("MedBLIP model not loaded")

        image = self.preprocess_image(image_input)
        
        inputs = self.processor(images=image, return_tensors="pt").to(self.device, torch.float16 if "cuda" in str(self.device) else torch.float32)
        
        with torch.no_grad():
            outputs = self.model.get_qformer_features(**inputs)
            # We take the mean of the query tokens as the image representation
            image_features = outputs.last_hidden_state.mean(dim=1)
        
        # Normalize features
        image_features = image_features / image_features.norm(p=2, dim=-1, keepdim=True)
        
        return image_features.cpu().numpy()

    def analyze_clinical_features(self, image_input: Union[str, Image.Image, bytes]) -> Dict[str, Any]:
        """
        Comprehensive analysis returning both embeddings and generated description.
        """
        image = self.preprocess_image(image_input)
        
        # Extract features
        embeddings = self.extract_features(image)
        
        # Generate description
        description = self.generate_report(image)
        
        return {
            "embeddings": embeddings.tolist(),
            "shape": list(embeddings.shape),
            "visual_description": description,
            "model": "MedBLIP/BLIP-2",
            "status": "success"
        }
