# app/medgemma_service.py
import os
import time
import base64
from typing import Optional, Union
import numpy as np
import torch
from transformers import AutoProcessor, AutoModelForCausalLM

MODEL_NAME = os.environ.get("MEDGEMMA_MODEL_PATH", "google/medgemma-2b-it")

class MedGemmaService:
    def __init__(self, model_name: str = MODEL_NAME, device: Optional[str] = None):
        # select device
        if device:
            self.device = torch.device(device)
        else:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[MedGemmaService] device: {self.device}, model: {model_name}")

        # processor (handles text + optionally images)
        self.processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
        # load model (device_map="auto" helps for multi-gpu or large models)
        # For simple servers, device_map="auto" will place layers automatically if accelerate is installed.
        try:
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                trust_remote_code=True,
                device_map="auto"  # best-effort placement
            )
        except Exception as e:
            # fallback: load to single device
            print("[MedGemmaService] device_map auto failed, loading to single device:", e)
            self.model = AutoModelForCausalLM.from_pretrained(model_name, trust_remote_code=True)
            self.model.to(self.device)
        self.model.eval()
        print("[MedGemmaService] model loaded.")

    def _normalize_embedding(self, emb: Union[np.ndarray, torch.Tensor]) -> torch.Tensor:
        if isinstance(emb, np.ndarray):
            emb = torch.from_numpy(emb)
        if emb.dim() == 1:
            emb = emb.unsqueeze(0)  # (1, dim)
        if emb.dim() == 2:
            emb = emb.unsqueeze(1)  # (1, 1, dim)
        emb = emb.to(self.device).to(torch.float32)
        emb = torch.nn.functional.normalize(emb, dim=-1)
        return emb

    def build_prompt(self, age_months: int, observations: str, domain_prompt: Optional[str] = None) -> str:
        prompt = f"[CHILD AGE (months)]: {age_months}\n[OBSERVATIONS]: {observations}\n\nTask: Provide a short clinical summary (2-4 bullets), a risk level (low/monitor/high/refer), and 3 actionable recommendations (including one parent-friendly)."
        if domain_prompt:
            prompt = domain_prompt + "\n\n" + prompt
        return prompt

    def infer(self,
              precomputed_image_emb: Optional[Union[np.ndarray, torch.Tensor]] = None,
              age_months: int = 24,
              observations: str = "",
              max_new_tokens: int = 256,
              temperature: float = 0.0):
        prompt = self.build_prompt(age_months, observations)
        # tokenize text
        text_inputs = self.processor(text=prompt, return_tensors="pt", padding=True).to(self.device)
        model_inputs = dict(text_inputs)

        if precomputed_image_emb is not None:
            emb = self._normalize_embedding(precomputed_image_emb)  # shape (1, seq_len, dim)
            # Try several common argument names
            injected = False
            for key in ("image_embeds", "vision_embeds", "image_features"):
                try:
                    model_inputs[key] = emb
                    injected = True
                    break
                except Exception:
                    continue
            if not injected:
                model_inputs["image_embeds"] = emb

        # generation
        start = time.time()
        try:
            out_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                do_sample=False
            )
        except TypeError as e:
            # fallback to text-only generation
            out_ids = self.model.generate(
                input_ids=text_inputs["input_ids"].to(self.device),
                attention_mask=text_inputs.get("attention_mask", None),
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                do_sample=False
            )
            fallback = True
        else:
            fallback = False
        elapsed = time.time() - start

        # decode
        # prefer model's tokenizer or processor
        tokenizer = getattr(self.model, "get_tokenizer", None)
        if tokenizer is None and hasattr(self.processor, "tokenizer"):
            tokenizer = self.processor.tokenizer
        if hasattr(self.model, "decoder"):
            # safe decode path
            try:
                text = self.processor.decode(out_ids[0], skip_special_tokens=True)
            except Exception:
                text = self.model.config.decode(out_ids[0], skip_special_tokens=True)
        else:
            try:
                text = tokenizer.decode(out_ids[0], skip_special_tokens=True)
            except Exception:
                text = self.model.config.decode(out_ids[0], skip_special_tokens=True)

        response = {"text": text, "inference_time_s": elapsed}
        if fallback:
            response["warning"] = "image embedding keys rejected, returned text-only result"
        return response
