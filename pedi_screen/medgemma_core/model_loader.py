"""
Model loading for MedGemma — base model and LoRA adapter management.
Robust loader with retries, timeout, and fallback; server can start in degraded (mock) mode.
"""
import logging
import os
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("model_loader")

# Module-level state after load_model() or fallback
MODEL = None
PROCESSOR = None
model_ready = False


def _get_settings():
    try:
        from configs.defaults import settings
        return settings
    except Exception:
        return None


def load_model(model_name: str) -> Tuple[Any, Any]:
    """
    Load vision/LLM model and processor with exponential-backoff retries.
    Raises on final failure; caller should set MODEL, PROCESSOR = None and model_ready = False.
    """
    try:
        from tenacity import (
            retry,
            stop_after_attempt,
            wait_exponential,
            retry_if_exception_type,
        )
    except ImportError:
        def retry(*args, **kwargs):
            def deco(f):
                return f
            return deco
        wait_exponential = lambda multiplier=0.5, max=8: None
        stop_after_attempt = lambda n: None
        retry_if_exception_type = lambda *e: None

    settings = _get_settings()
    max_attempts = getattr(settings, "RETRY_MAX", 5) if settings else 5
    base_delay = getattr(settings, "RETRY_BASE", 0.5) if settings else 0.5

    @retry(
        wait=wait_exponential(multiplier=base_delay, max=8) if wait_exponential else None,
        stop=stop_after_attempt(max_attempts) if stop_after_attempt else None,
        reraise=True,
    )
    def _load():
        logger.info("Loading model: %s", model_name)
        try:
            from transformers import AutoImageProcessor, AutoModel
            processor = AutoImageProcessor.from_pretrained(model_name, trust_remote_code=True)
            model = AutoModel.from_pretrained(model_name, trust_remote_code=True)
            model.eval()
            return model, processor
        except Exception as e:
            logger.exception("Failed loading model %s", model_name)
            raise

    return _load()


def ensure_model_loaded() -> bool:
    """
    Load model at startup; on failure set global MODEL, PROCESSOR to None and model_ready to False.
    Returns True if model is ready, False if in degraded (mock) mode.
    """
    global MODEL, PROCESSOR, model_ready
    settings = _get_settings()
    model_name = getattr(settings, "MODEL_NAME", "google/medgemma-2b-it") if settings else "google/medgemma-2b-it"
    try:
        MODEL, PROCESSOR = load_model(model_name)
        model_ready = True
        return True
    except Exception as e:
        logger.error("Model load failed; switching to degraded MOCK mode: %s", e)
        MODEL, PROCESSOR = None, None
        model_ready = False
        return False


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
