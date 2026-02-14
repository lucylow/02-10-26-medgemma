# app/medgemma_service.py
"""
MedGemma local inference service with robust device selection, warmup, and status.
"""
import logging
import os
import time
from typing import Any, Dict, Optional, Union

import numpy as np
import torch
from transformers import AutoProcessor, AutoModelForCausalLM

logger = logging.getLogger("medgemma.service")

MODEL_NAME = os.environ.get("MEDGEMMA_MODEL_PATH", "google/medgemma-2b-it")
DEVICE_PREFERENCE = os.environ.get("MEDGEMMA_DEVICE_PREFERENCE", "auto")


def _select_device() -> torch.device:
    """Select device from MEDGEMMA_DEVICE_PREFERENCE (auto, cuda:0, cpu)."""
    pref = (DEVICE_PREFERENCE or "auto").lower().strip()
    if pref == "cpu":
        return torch.device("cpu")
    if pref.startswith("cuda"):
        return torch.device(pref)
    # auto: prefer CUDA, then MPS (Apple silicon), then CPU
    if torch.cuda.is_available():
        device = torch.device("cuda:0")
        try:
            mem_free = torch.cuda.get_device_properties(0).total_memory
            logger.info("Device: %s, GPU memory: %.1f GB", device, mem_free / 1e9)
        except Exception:
            pass
        return device
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        logger.info("Device: mps (Apple Silicon)")
        return torch.device("mps")
    logger.info("Device: cpu (no CUDA/MPS)")
    return torch.device("cpu")


class MedGemmaService:
    def __init__(self, model_name: str = MODEL_NAME, device: Optional[str] = None):
        self.model_name = model_name
        self.adapter_id = os.environ.get("MEDGEMMA_ADAPTER_ID", "default")
        if device:
            self.device = torch.device(device)
        else:
            self.device = _select_device()
        logger.info("[MedGemmaService] device=%s, model=%s", self.device, model_name)

        self.processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
        self.model = self._load_model(model_name)
        self.model.eval()
        self._ready = True
        logger.info("[MedGemmaService] model loaded.")

    def _load_model(self, model_name: str) -> torch.nn.Module:
        """Load model with device_map=auto when possible; fallback to single device."""
        try:
            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                trust_remote_code=True,
                device_map="auto",
            )
            return model
        except Exception as e:
            logger.warning("device_map=auto failed: %s; loading to single device", e)
            try:
                model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    trust_remote_code=True,
                    map_location=self.device,
                )
                model.to(self.device)
                return model
            except Exception as load_err:
                raise RuntimeError(
                    f"Model load failed: {load_err}. "
                    "Try smaller model or increase GPU memory. For CPU-only: set MEDGEMMA_DEVICE_PREFERENCE=cpu"
                ) from load_err

    def _normalize_embedding(
        self,
        emb: Union[np.ndarray, torch.Tensor],
        device: Optional[torch.device] = None,
    ) -> torch.Tensor:
        """Convert embedding to torch float32, L2-normalize, place on device."""
        if isinstance(emb, np.ndarray):
            emb = torch.from_numpy(emb.astype(np.float32))
        emb = emb.to(torch.float32)
        if emb.dim() == 1:
            emb = emb.unsqueeze(0)
        if emb.dim() == 2:
            emb = emb.unsqueeze(1)  # (1, 1, dim)
        target = device or self.device
        emb = emb.to(target)
        emb = torch.nn.functional.normalize(emb, dim=-1)
        return emb

    def warmup(self, prompt: str = "Hello", max_new_tokens: int = 5) -> Dict[str, Any]:
        """Run a small prompt to ensure model is ready (for liveness/health checks)."""
        t0 = time.perf_counter()
        try:
            inputs = self.processor(text=prompt, return_tensors="pt", padding=True).to(self.device)
            with torch.no_grad():
                _ = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    do_sample=False,
                )
            elapsed = time.perf_counter() - t0
            return {"ok": True, "warmup_time_s": round(elapsed, 3)}
        except Exception as e:
            logger.exception("Warmup failed: %s", e)
            return {"ok": False, "error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        """Return device, model name, ready state, and memory info."""
        mem_free = None
        if self.device.type == "cuda":
            try:
                mem_free = torch.cuda.get_device_properties(0).total_memory
            except Exception:
                pass
        return {
            "device": str(self.device),
            "model": self.model_name,
            "ready": getattr(self, "_ready", True),
            "mem_free_bytes": mem_free,
            "adapter_id": self.adapter_id,
        }

    def build_prompt(
        self,
        age_months: int,
        observations: str,
        domain_prompt: Optional[str] = None,
    ) -> str:
        prompt = f"[CHILD AGE (months)]: {age_months}\n[OBSERVATIONS]: {observations}\n\nTask: Provide a short clinical summary (2-4 bullets), a risk level (low/monitor/high/refer), and 3 actionable recommendations (including one parent-friendly)."
        if domain_prompt:
            prompt = domain_prompt + "\n\n" + prompt
        return prompt

    def infer(
        self,
        precomputed_image_emb: Optional[Union[np.ndarray, torch.Tensor]] = None,
        age_months: int = 24,
        observations: str = "",
        max_new_tokens: int = 256,
        temperature: float = 0.0,
    ) -> Dict[str, Any]:
        prompt = self.build_prompt(age_months, observations)
        text_inputs = self.processor(text=prompt, return_tensors="pt", padding=True).to(self.device)
        model_inputs = dict(text_inputs)

        fallback = False
        out_ids = None
        if precomputed_image_emb is not None:
            emb = self._normalize_embedding(precomputed_image_emb)
            injection_keys = ("image_embeds", "vision_embeds", "image_features")
            for key in injection_keys:
                try:
                    test_inputs = {**model_inputs, key: emb}
                    out_ids = self.model.generate(
                        **test_inputs,
                        max_new_tokens=max_new_tokens,
                        temperature=temperature,
                        do_sample=False,
                    )
                    break
                except TypeError:
                    continue
            if out_ids is None:
                fallback = True
                logger.warning(
                    "Embedding injection keys rejected: model=%s adapter_id=%s; falling back to text-only",
                    self.model_name,
                    self.adapter_id,
                )
                out_ids = self.model.generate(
                    input_ids=text_inputs["input_ids"].to(self.device),
                    attention_mask=text_inputs.get("attention_mask"),
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    do_sample=False,
                )

        if out_ids is None:
            out_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                do_sample=False,
            )

        start = time.time()
        # Decode
        tokenizer = getattr(self.model, "get_tokenizer", None)
        if tokenizer is None and hasattr(self.processor, "tokenizer"):
            tokenizer = self.processor.tokenizer
        try:
            if hasattr(self.processor, "decode"):
                text = self.processor.decode(out_ids[0], skip_special_tokens=True)
            elif tokenizer:
                text = tokenizer.decode(out_ids[0], skip_special_tokens=True)
            else:
                text = str(out_ids[0])
        except Exception:
            text = str(out_ids[0])
        elapsed = time.time() - start

        response: Dict[str, Any] = {"text": text, "inference_time_s": elapsed}
        if fallback:
            response["warning"] = "image embedding keys rejected"
        return response
