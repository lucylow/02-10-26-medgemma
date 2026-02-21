# model-dev/deploy/modelserver/app/medgemma_service.py
"""
MedGemmaService wrapper for inference.

Responsibilities:
- Load the base MedGemma model (or a compatible causal LM that accepts
  precomputed image embeddings) and provide a simple infer(...) method.
- Normalize and inject precomputed image embeddings into model inputs
  in a robust way (tries common injection keys).
- Provide a lightweight fallback if full model load is not possible in dev.

Notes:
- This is a skeleton intended for development. Replace the "fallback"
  behavior with your production model loading logic (HF model, PEFT adapter, etc.)
- Keep secrets out of logs and avoid printing raw inputs that may contain PHI.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, Optional, Union

import numpy as np
import torch

# Transformers imports are optional at dev time; import lazily to allow quick tests
try:
    from transformers import AutoModelForCausalLM, AutoProcessor
except Exception:
    AutoProcessor = None
    AutoModelForCausalLM = None

logger = logging.getLogger("medgemma_service")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    logger.addHandler(ch)


class MedGemmaService:
    """
    Lightweight service wrapper that exposes:
      - initialization / load_model()
      - infer(precomputed_image_emb, age_months, observations, ...)
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        device: Optional[str] = None,
        use_peft_adapter: Optional[str] = None,
        trust_remote_code: bool = True,
    ):
        """
        Args:
            model_name: HF model id or local path for base model. If None, a fallback
                        deterministic stub behaviour will be used (useful for dev).
            device: 'cuda', 'cpu', or None to auto-detect.
            use_peft_adapter: optional path/id to a PEFT adapter to load on top of base.
            trust_remote_code: set True if loading custom model code from HF (use with caution).
        """
        self.model_name = model_name or os.environ.get("MEDGEMMA_MODEL_PATH")
        self.adapter = use_peft_adapter or os.environ.get("PEFT_ADAPTER_PATH")
        # determine device
        if device:
            self.device = torch.device(device)
        else:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.trust_remote_code = trust_remote_code

        self.processor = None
        self.model = None
        self.loaded = False

        # model load attempt happens lazily (on first inference) to improve startup time
        logger.info(
            "MedGemmaService initialized (model=%s, adapter=%s, device=%s)",
            self.model_name,
            self.adapter,
            self.device,
        )

    def load_model(self) -> None:
        """Attempt to load the model and processor. This is safe to call multiple times."""
        if self.loaded:
            return

        if not self.model_name:
            logger.warning(
                "No MEDGEMMA_MODEL_PATH provided; MedGemmaService will run in fallback mode."
            )
            self.loaded = False
            return

        if AutoProcessor is None or AutoModelForCausalLM is None:
            logger.warning(
                "transformers not available in environment; cannot load model. Running fallback."
            )
            self.loaded = False
            return

        try:
            logger.info("Loading processor and model from %s ...", self.model_name)
            # processor: handles tokenization (and possibly image prep if model expects it)
            self.processor = AutoProcessor.from_pretrained(
                self.model_name, trust_remote_code=self.trust_remote_code
            )
            # model: causal LM
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name, trust_remote_code=self.trust_remote_code
            )
            self.model.to(self.device)
            self.model.eval()
            # optional: if adapter path is set, load PEFT adapter (wrap as needed)
            if self.adapter:
                try:
                    from peft import PeftModel

                    logger.info("Loading PEFT adapter from %s", self.adapter)
                    self.model = PeftModel.from_pretrained(self.model, self.adapter)
                    self.model.to(self.device)
                except Exception as e:
                    logger.warning("PEFT adapter load failed: %s", e)

            self.loaded = True
            logger.info("MedGemmaService model loaded successfully.")
        except Exception as e:
            logger.exception("Failed to load MedGemma model: %s", e)
            self.loaded = False

    def _normalize_embedding(self, emb: Union[np.ndarray, torch.Tensor]) -> torch.Tensor:
        """
        Normalize an embedding to the shape expected by the model.

        Accepts numpy array or torch tensor. Returns a float32 torch tensor on the configured device.
        Common shapes accepted: (dim,), (1, dim), (1, seq_len, dim).
        """
        if emb is None:
            raise ValueError("No embedding provided to _normalize_embedding")

        if isinstance(emb, np.ndarray):
            emb = torch.from_numpy(emb)
        if not isinstance(emb, torch.Tensor):
            emb = torch.tensor(emb)

        # ensure float32
        emb = emb.to(dtype=torch.float32)

        # if shape is (dim,) -> (1, dim)
        if emb.dim() == 1:
            emb = emb.unsqueeze(0)

        # if model expects (1, seq_len, dim) and we have (1, dim), expand seq_len=1
        if emb.dim() == 2:
            emb = emb.unsqueeze(1)

        emb = emb.to(self.device)
        # L2-normalize (common practice for embeddings)
        try:
            emb = torch.nn.functional.normalize(emb, dim=-1)
        except Exception:
            pass

        return emb

    def _inject_embedding_into_inputs(
        self, model_inputs: Dict[str, Any], emb_tensor: torch.Tensor
    ) -> Dict[str, Any]:
        """
        Attempt to inject the given embedding tensor into model inputs under a recognized key.

        Many multimodal models accept keys like: "image_embeds", "vision_embeds", "image_features".
        We attempt a small set of candidates.
        """
        candidates = (
            "image_embeds",
            "vision_embeds",
            "image_features",
            "precomputed_image_emb",
        )
        for key in candidates:
            try:
                model_inputs[key] = emb_tensor
                return model_inputs
            except Exception:
                continue
        # fallback: store under 'image_embeds'
        model_inputs["image_embeds"] = emb_tensor
        return model_inputs

    def infer(
        self,
        precomputed_image_emb: Optional[Union[np.ndarray, torch.Tensor]] = None,
        age_months: Optional[int] = None,
        observations: Optional[str] = None,
        max_new_tokens: int = 256,
        temperature: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Perform inference using the loaded model.

        Returns a dict with keys:
          - text: generated text (string)
          - inference_time_s: float
          - model_version: (if available)
          - warning: optional (e.g., 'model not loaded -> fallback')
        """
        start = time.time()

        # Lazy model load
        if not self.loaded:
            self.load_model()

        prompt = self.build_prompt(age_months, observations)

        # If model not loaded, return a deterministic fallback response (safe for demo)
        if not self.loaded or self.model is None or self.processor is None:
            logger.info(
                "MedGemma model not loaded; returning deterministic fallback result."
            )
            text = (
                "Draft summary (fallback): Model not loaded in this environment. "
                "This is a placeholder response for development only. "
                "Provide a real model path via MEDGEMMA_MODEL_PATH to enable real inference."
            )
            if observations:
                text += f" Observations echo: {observations[:200]}"
            return {
                "text": text,
                "inference_time_s": time.time() - start,
                "model_version": self.model_name or "fallback",
                "warning": "FALLBACK_NO_MODEL",
            }

        # Tokenize prompt
        try:
            text_inputs = self.processor(
                text=prompt, return_tensors="pt", padding=True
            ).to(self.device)
        except Exception as e:
            logger.warning(
                "Processor tokenization failed; attempting tokenizer-only path: %s", e
            )
            # fallback: if processor not implementing .__call__, try processor.tokenizer
            try:
                tokenizer = getattr(self.processor, "tokenizer", None)
                if tokenizer:
                    text_inputs = tokenizer(
                        prompt, return_tensors="pt", padding=True
                    ).to(self.device)
                else:
                    raise RuntimeError("No tokenizer available in processor.")
            except Exception as e2:
                logger.exception("Tokenization fallback failed: %s", e2)
                return {"text": "Tokenization error", "error": str(e2)}

        model_inputs = dict(text_inputs)

        # If embedding provided, normalize and inject
        if precomputed_image_emb is not None:
            try:
                emb_tensor = self._normalize_embedding(precomputed_image_emb)
                model_inputs = self._inject_embedding_into_inputs(
                    model_inputs, emb_tensor
                )
            except Exception as e:
                logger.exception("Failed to process embedding: %s", e)
                # continue to run text-only path

        # Now call model.generate with robust error handling
        try:
            out_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                do_sample=False,
            )
            # decode
            # prefer processor.decode if available
            try:
                text = self.processor.decode(out_ids[0], skip_special_tokens=True)
            except Exception:
                # fallback to model.config.decode or tokenizer
                tokenizer = getattr(self.processor, "tokenizer", None)
                if tokenizer:
                    text = tokenizer.decode(out_ids[0], skip_special_tokens=True)
                else:
                    text = str(out_ids[0].tolist())
        except TypeError as e:
            # Some models may not accept the injected keys; attempt text-only generate
            logger.warning(
                "Model.generate rejected inputs - falling back to text-only generation: %s",
                e,
            )
            try:
                text_ids = self.model.generate(
                    input_ids=text_inputs["input_ids"].to(self.device),
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    do_sample=False,
                )
                tokenizer = getattr(self.processor, "tokenizer", None)
                if tokenizer:
                    text = tokenizer.decode(text_ids[0], skip_special_tokens=True)
                else:
                    text = str(text_ids[0].tolist())
            except Exception as e2:
                logger.exception("Text-only fallback failed: %s", e2)
                return {"text": "inference_error", "error": str(e2)}
        except Exception as e:
            logger.exception("Unexpected inference error: %s", e)
            return {"text": "inference_error", "error": str(e)}

        elapsed = time.time() - start
        resp = {
            "text": text,
            "inference_time_s": elapsed,
            "model_version": self.model_name,
        }
        return resp

    def build_prompt(
        self,
        age_months: Optional[int],
        observations: Optional[str],
        domain_prompt: Optional[str] = None,
    ) -> str:
        """
        Construct a consistent prompt for the model given structured metadata.
        """
        age_line = (
            f"[CHILD AGE (months)]: {age_months}" if age_months is not None else ""
        )
        obs_line = (
            f"[OBSERVATIONS]: {observations}"
            if observations
            else "[OBSERVATIONS]: (none)"
        )
        prompt = f"{age_line}\n{obs_line}\n\nTask: Provide a short clinical summary (2-4 bullets), a risk level (low/monitor/high), and 3 actionable recommendations (including one parent-friendly)."
        if domain_prompt:
            prompt = domain_prompt + "\n\n" + prompt
        return prompt
