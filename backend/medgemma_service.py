"""
MedGemma inference service with real model + LoRA adapter loading.
Supports REAL_MODE, FALLBACK_ON_ERROR, and circuit-breaker behavior.
"""
import json
import logging
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

logger = logging.getLogger("medgemma_service")
logger.setLevel(logging.INFO)

# Config from env
REAL_MODE = os.getenv("REAL_MODE", "true").lower() in ("1", "true", "yes")
FALLBACK_ON_ERROR = os.getenv("FALLBACK_ON_ERROR", "true").lower() in ("1", "true", "yes")
MODEL_LOAD_TIMEOUT = int(os.getenv("MODEL_LOAD_TIMEOUT_SEC", "60"))
INFER_TIMEOUT = int(os.getenv("INFER_TIMEOUT_SEC", "30"))
FAILURE_THRESHOLD = int(os.getenv("FAILURE_THRESHOLD", "3"))
FAILURE_COOLDOWN = int(os.getenv("FAILURE_COOLDOWN_SEC", "300"))

BASE_MODEL_ID = os.getenv("MEDGEMMA_BASE", "google/medgemma-2b-it")
ADAPTER_PATH = os.getenv("ADAPTER_PATH", None)


class CircuitBreaker:
    """Circuit breaker: after N consecutive failures, use fallback for cooldown window."""

    def __init__(self):
        self.fail_count = 0
        self.lock = threading.Lock()
        self.cooldown_until: Optional[datetime] = None

    def record_failure(self):
        with self.lock:
            self.fail_count += 1
            logger.warning("MedGemma failure count -> %d", self.fail_count)
            if self.fail_count >= FAILURE_THRESHOLD:
                self.cooldown_until = datetime.utcnow() + timedelta(seconds=FAILURE_COOLDOWN)
                logger.warning("Entering cooldown until %s", self.cooldown_until.isoformat())

    def record_success(self):
        with self.lock:
            self.fail_count = 0
            self.cooldown_until = None

    def is_open(self) -> bool:
        with self.lock:
            if self.cooldown_until and datetime.utcnow() < self.cooldown_until:
                return True
            return False


_circuit = CircuitBreaker()


class MedGemmaService:
    """
    Local MedGemma + PEFT adapter inference.
    Tries real models when REAL_MODE=true; falls back to deterministic mock on error.
    """

    def __init__(
        self,
        base_model_id: Optional[str] = None,
        adapter_path: Optional[str] = None,
    ):
        self.base_model_id = base_model_id or BASE_MODEL_ID
        self.adapter_path = adapter_path or ADAPTER_PATH
        self.model = None
        self.tokenizer = None
        self.model_id = None
        self.adapter_id = None
        self.loaded = False

        if REAL_MODE:
            try:
                self._load_models_with_timeout(timeout=MODEL_LOAD_TIMEOUT)
                logger.info("MedGemmaService loaded real models.")
            except Exception as e:
                logger.exception("Failed to load MedGemma models: %s", e)
                self.loaded = False

    def _load_models_with_timeout(self, timeout: int = 60):
        """Load base model and adapter. Raises on failure."""
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        start = time.time()
        device_map = "auto" if torch.cuda.is_available() else None
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.base_model_id, trust_remote_code=True
        )
        base = AutoModelForCausalLM.from_pretrained(
            self.base_model_id,
            trust_remote_code=True,
            device_map=device_map,
        )

        if self.adapter_path and (
            os.path.exists(self.adapter_path) if isinstance(self.adapter_path, str) else True
        ):
            try:
                from peft import PeftModel

                logger.info("Loading adapter from %s", self.adapter_path)
                self.model = PeftModel.from_pretrained(base, self.adapter_path)
                self.adapter_id = self.adapter_path
            except Exception as e:
                logger.warning("Adapter load failed, using base: %s", e)
                self.model = base
                self.adapter_id = None
        else:
            self.model = base
            self.adapter_id = None

        self.model_id = self.base_model_id
        self.model.eval()
        self.loaded = True
        elapsed = time.time() - start
        logger.info("Model and adapter loaded in %.2fs", elapsed)

    def infer(
        self,
        observations_text: str,
        embedding_np,
        age_months: int,
        max_tokens: int = 256,
        prompt_metadata: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Try inference using real model; on any exception, fallback to deterministic mock.
        """
        if _circuit.is_open():
            logger.warning("Circuit open - returning fallback inference")
            return self._fallback_inference(observations_text, age_months)

        if not (REAL_MODE and self.loaded and self.model is not None):
            logger.info("Real mode disabled or model not loaded - returning fallback.")
            return self._fallback_inference(observations_text, age_months)

        try:
            import torch

            prompt = self._build_prompt(observations_text, age_months)
            device = next(self.model.parameters()).device
            inputs = self.tokenizer(prompt, return_tensors="pt").to(device)

            start = time.time()
            with torch.no_grad():
                out = self.model.generate(**inputs, max_new_tokens=max_tokens)
            elapsed = time.time() - start

            text = self.tokenizer.decode(out[0], skip_special_tokens=True)
            parsed = self.safe_parse_json_from_text(text)
            _circuit.record_success()

            parsed.setdefault("confidence", 0.5)
            parsed.setdefault("adapter_id", self.adapter_id or "")
            parsed.setdefault("model_id", self.model_id or "")
            parsed.setdefault("inference_time_s", elapsed)
            return parsed
        except Exception as e:
            logger.exception("MedGemma inference failed: %s", e)
            _circuit.record_failure()
            try:
                import torch

                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass
            if FALLBACK_ON_ERROR:
                logger.info("Falling back to mock inference due to error")
                return self._fallback_inference(observations_text, age_months)
            raise

    def _build_prompt(self, observations_text: str, age_months: int) -> str:
        prompt = (
            f"[METADATA]\nchild_age_months: {age_months}\n"
            f"[OBSERVATIONS]\n{observations_text}\n"
            "INSTRUCTION:\nYou are a clinical decision support assistant. Output JSON:"
        )
        return prompt

    def safe_parse_json_from_text(self, text: str) -> Dict[str, Any]:
        """Robust JSON extraction from model output."""
        try:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                obj = json.loads(text[start : end + 1])
                return obj
        except Exception:
            logger.warning("Failed to parse JSON from model text - returning raw text")
        return {"raw_text": text, "summary": [], "risk": "monitor", "recommendations": []}

    def _fallback_inference(self, observations_text: str, age_months: int) -> Dict[str, Any]:
        """Deterministic fallback that follows the inference schema."""
        summary = [f"Automated fallback summary for age {age_months} months."]
        risk = "monitor"
        lower = observations_text.lower()
        if "no words" in lower or "not responding" in lower or "regress" in lower:
            risk = "refer"
        elif "few words" in lower or "delayed" in lower:
            risk = "monitor"
        recs = [
            "Re-screen in 2–3 months.",
            "Offer language-promoting activities daily.",
            "If concerns persist, refer to specialist.",
        ]
        return {
            "summary": summary,
            "risk": risk,
            "recommendations": recs,
            "parent_text": "This is a preliminary, automated summary. Please consult your clinician.",
            "explain": "Fallback heuristic used; real model unavailable or produced error.",
            "confidence": 0.4,
            "adapter_id": self.adapter_id or "fallback",
            "model_id": self.model_id or "fallback",
            "inference_time_s": 0.0,
        }
