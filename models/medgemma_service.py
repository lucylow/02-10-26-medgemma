import time
from typing import Optional, Union
import torch
import numpy as np

from transformers import AutoProcessor, AutoModelForCausalLM
from config.settings import settings

class MedGemmaService:
    def __init__(self, model_name: str = settings.MEDGEMMA_MODEL_PATH, device: str = settings.AI_MODEL_DEVICE):
        self.device = torch.device(device if torch.cuda.is_available() else "cpu")
        self.model_name = model_name
        # processor must handle text tokenization and (optionally) image inputs
        self.processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            trust_remote_code=True,
            device_map="auto"  # or manual device map if you prefer
        )
        self.model.eval()

    def build_prompt(self, age_months: int, observations: str, domain_prompt: Optional[str] = None) -> str:
        prompt = f"[CHILD AGE (months)]: {age_months}\n[OBSERVATIONS]: {observations}\n\nTask: Provide a short clinical summary (2-4 bullets), a risk level (low/monitor/high/refer), and 3 actionable recommendations (one parent-friendly)."
        if domain_prompt:
            prompt = domain_prompt + "\n\n" + prompt
        return prompt

    def _normalize_embedding(self, emb: Union[torch.Tensor, np.ndarray]) -> torch.Tensor:
        """
        Ensure embedding is a torch.FloatTensor on the model device with shape (batch=1, seq?, dim).
        Many vision encoders produce a pooled vector (dim,) or (1, dim).
        Some multimodal LM expects (batch, seq_len, hidden) — we keep seq_len=1 by default.
        """
        if isinstance(emb, np.ndarray):
            emb = torch.from_numpy(emb)
        if emb.dim() == 1:
            emb = emb.unsqueeze(0)        # (1, dim)
        # convert to float and move to device
        emb = emb.to(self.device).to(torch.float32)
        # if model expects sequence dimension, make (1,1,dim)
        if emb.dim() == 2:
            emb = emb.unsqueeze(1)  # (1,1,dim)
        # L2 normalize
        emb = torch.nn.functional.normalize(emb, dim=-1)
        return emb  # shape (1, seq_len, dim)

    def infer(self,
              pil_image=None,
              precomputed_image_emb: Optional[Union[torch.Tensor, np.ndarray]] = None,
              age_months: int = 24,
              observations: str = "",
              max_new_tokens: int = 256,
              temperature: float = 0.0):
        """
        Multimodal inference that accepts either:
          - an inlined PIL image (pil_image) OR
          - a precomputed image embedding (precomputed_image_emb) produced by MedSigLIP
        Exactly one of pil_image or precomputed_image_emb should be provided if an image is needed.
        """
        prompt = self.build_prompt(age_months, observations)
        # Tokenize text portion
        text_inputs = self.processor(text=prompt, return_tensors="pt", padding=True).to(self.device)

        # Determine how to pass image info:
        # Preferred: if model supports image input via processor, pass images directly
        model_inputs = dict(text_inputs)
        # Case A: raw PIL image passed and processor supports images
        if pil_image is not None:
            try:
                proc_inputs = self.processor(images=pil_image, text=prompt, return_tensors="pt").to(self.device)
                model_inputs = dict(proc_inputs)
            except Exception:
                # fallback to text-only tokenized inputs (model might need embeddings instead)
                model_inputs = dict(text_inputs)

        # Case B: precomputed embedding supplied (our new path)
        if precomputed_image_emb is not None:
            emb = self._normalize_embedding(precomputed_image_emb)  # (1, seq_len, dim)
            # Try a set of common input names — different HF multimodal models use different keys.
            # We try to detect which key the model forward accepts. Many medgemma variants accept "image_embeds" or "vision_embeds".
            preferred_keys = ["image_embeds", "vision_embeds", "image_features", "pixel_values"]
            injected = False
            for key in preferred_keys:
                try:
                    # attach emb under this key if the model's forward supports it
                    # we put it in CPU/device already
                    model_inputs[key] = emb
                    injected = True
                    break
                except Exception:
                    # if processor returns immutable mapping, convert to dict and try
                    model_inputs = dict(model_inputs)
                    model_inputs[key] = emb
                    injected = True
                    break
            if not injected:
                # last resort: attach under "image_embeds"
                model_inputs["image_embeds"] = emb

        # GENERATE
        start = time.time()
        try:
            # Note: many custom HF multimodal models have a generate() override that accepts image_embeds keys.
            out_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                do_sample=False
            )
            elapsed = time.time() - start
            # decode
            # prefer built-in tokenizer if available on model config
            tokenizer = getattr(self.model, "tokenizer", None)
            if tokenizer is None:
                # try processor
                tokenizer = getattr(self.processor, "tokenizer", None)
            if tokenizer is not None:
                text = tokenizer.decode(out_ids[0], skip_special_tokens=True)
            else:
                text = self.model.config.decode(out_ids[0], skip_special_tokens=True)
            return {"text": text, "inference_time": elapsed}
        except TypeError as e:
            # generate refused our extra keys — produce helpful error and fallback to text-only generation
            # fallback: run generate only with tokenized text
            elapsed = time.time() - start
            # try text-only generation (safer but loses image info)
            try:
                out_ids = self.model.generate(
                    input_ids=text_inputs["input_ids"].to(self.device),
                    attention_mask=text_inputs.get("attention_mask", None),
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    do_sample=False
                )
                tokenizer = getattr(self.model, "tokenizer", None) or getattr(self.processor, "tokenizer", None)
                if tokenizer:
                    text = tokenizer.decode(out_ids[0], skip_special_tokens=True)
                else:
                    text = self.model.config.decode(out_ids[0], skip_special_tokens=True)
                return {
                    "text": text,
                    "inference_time": elapsed,
                    "warning": "model.generate rejected image embedding keys; returned text-only output"
                }
            except Exception as e2:
                # bubble up detailed error
                raise RuntimeError(f"generate failed with embedding keys (TypeError: {e}) and fallback text-only generate failed ({e2})")
