"""
Model loading for MedGemma — base model and LoRA adapter management.
"""
import os
from typing import Any, Dict, Optional


class ModelLoader:
    """
    Load MedGemma base model and optional LoRA adapters.
    Supports Vertex AI, Hugging Face, and local paths.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.base_model_id = self.config.get("BASE_MODEL_ID", "google/medgemma-2b-it")
        self.adapter_path = self.config.get("LORA_ADAPTER_PATH") or self.config.get("adapter_id")
        self._model = None
        self._adapter_loaded = False

    def load(self) -> bool:
        """
        Load model resources. Returns True if successful.
        In cloud/API mode, model may be loaded lazily by the inference service.
        """
        # Adapter validation: check path exists if local
        if self.adapter_path and not self.adapter_path.startswith(("gs://", "https://")):
            if not os.path.exists(self.adapter_path):
                return False
            self._adapter_loaded = True
        elif self.adapter_path:
            self._adapter_loaded = True
        return True

    @property
    def adapter_id(self) -> Optional[str]:
        """Adapter identifier for provenance."""
        return self.adapter_path

    @property
    def model_id(self) -> str:
        """Base model identifier for provenance."""
        return self.base_model_id
