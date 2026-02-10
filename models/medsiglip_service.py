from transformers import AutoImageProcessor, AutoModel
from PIL import Image
import torch
import numpy as np
from config.settings import settings

class MedSigLIPService:
    def __init__(self, model_name: str = settings.MEDSIGLIP_MODEL_PATH, device: str = settings.AI_MODEL_DEVICE):
        self.device = torch.device(device if torch.cuda.is_available() else "cpu")
        # AutoImageProcessor is typically the entrypoint for vision encoders
        self.processor = AutoImageProcessor.from_pretrained(model_name, trust_remote_code=True)
        # load the vision encoder (returns embeddings)
        self.model = AutoModel.from_pretrained(model_name, trust_remote_code=True).to(self.device)
        self.model.eval()

    def image_to_embedding(self, pil_image: Image.Image) -> torch.Tensor:
        """
        Returns a normalized embedding vector (1D tensor) for an input PIL image.
        """
        # preprocessing - resizing / normalization handled by processor
        inputs = self.processor(images=pil_image, return_tensors="pt")
        # move tensors to device
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = self.model(**inputs)
            # many visual encoders return last_hidden_state or pooled output
            # adapt based on model architecture: choose pooled_output if present
            if hasattr(outputs, "pooler_output") and outputs.pooler_output is not None:
                emb = outputs.pooler_output  # (batch, hidden)
            else:
                # fallback: mean pool tokens
                hidden = outputs.last_hidden_state  # (batch, seq, hidden)
                emb = hidden.mean(dim=1)
            # normalize
            emb = torch.nn.functional.normalize(emb, dim=-1)
            return emb.squeeze(0).cpu()  # return CPU tensor (1D)
