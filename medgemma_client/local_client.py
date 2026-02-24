"""Local MedGemma via Hugging Face / GPU. Official loading pattern."""
import os
import time
import base64
import json
import re
from typing import Optional
import numpy as np

from .schemas import ScreeningRequest, ScreeningResponse

MODEL_NAME = os.getenv("MEDGEMMA_MODEL_NAME", "google/medgemma-2b-it")
ADAPTER_DIR = os.getenv("ADAPTER_LOCAL_DIR", "")


class LocalMedGemmaClient:
    def __init__(self, model_name: str = MODEL_NAME, adapter_dir: Optional[str] = None):
        self.model_name = model_name
        self.adapter_dir = adapter_dir or ADAPTER_DIR
        self._model = None
        self._tokenizer = None
        self._device = None

    def _load(self):
        if self._model is not None:
            return
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM
        from peft import PeftModel

        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._tokenizer = AutoTokenizer.from_pretrained(self.model_name, trust_remote_code=True)
        self._model = AutoModelForCausalLM.from_pretrained(
            self.model_name, trust_remote_code=True, device_map="auto"
        )
        if self.adapter_dir and os.path.isdir(self.adapter_dir) and os.listdir(self.adapter_dir):
            self._model = PeftModel.from_pretrained(self._model, self.adapter_dir, device_map="auto")
        self._model.eval()

    def screen(self, req: ScreeningRequest) -> ScreeningResponse:
        self._load()
        prompt = self._build_prompt(req)
        inputs = self._tokenizer(prompt, return_tensors="pt").to(self._device)
        model_inputs = dict(inputs)

        if req.embedding_b64:
            emb = np.frombuffer(base64.b64decode(req.embedding_b64), dtype=np.float32)
            shape = req.shape or [1, 256]
            emb = emb.reshape(shape)
            import torch
            emb_t = torch.from_numpy(emb).to(self._device).float()
            if emb_t.dim() == 1:
                emb_t = emb_t.unsqueeze(0)
            if emb_t.dim() == 2:
                emb_t = emb_t.unsqueeze(1)
            for key in ("image_embeds", "vision_embeds", "inputs_embeds"):
                try:
                    model_inputs[key] = emb_t
                    break
                except Exception:
                    continue

        start = time.perf_counter()
        with __import__("torch").no_grad():
            out_ids = self._model.generate(
                **model_inputs,
                max_new_tokens=1024,
                temperature=0.1,
                do_sample=False,
            )
        elapsed = time.perf_counter() - start
        text = self._tokenizer.decode(out_ids[0], skip_special_tokens=True)
        parsed = self._parse_json(text)
        risk = "moderate"
        recs = []
        conf = 0.5
        adapter_id = self.adapter_dir or None
        if parsed:
            rs = parsed.get("risk_stratification") or {}
            risk = (rs.get("level") or risk).lower()
            recs = parsed.get("recommendations") or {}
            if isinstance(recs, dict):
                recs = recs.get("immediate", []) + recs.get("short_term", [])
            if not isinstance(recs, list):
                recs = [str(recs)]
            conf = float(rs.get("confidence", conf))
        return ScreeningResponse(
            risk=risk,
            recommendations=recs,
            confidence=conf,
            adapter_id=adapter_id,
            model_id=self.model_name,
            evidence=[],
            reasoning_chain=[],
            clinical_summary=parsed.get("clinical_summary") if parsed else None,
            raw_json=parsed,
            inference_time_s=elapsed,
            fallback_used=False,
        )

    def _build_prompt(self, req: ScreeningRequest) -> str:
        return f"""SYSTEM: You are a pediatric developmental screening support model. You do not diagnose.
INPUT: Child age (months): {req.age_months}. Observations: {req.observations or "None."}
OUTPUT: Respond with a single JSON object with keys: risk_stratification (level, confidence, rationale), clinical_summary, recommendations (immediate, short_term).
JSON:"""

    def _parse_json(self, text: str) -> Optional[dict]:
        if not text:
            return None
        m = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", text, re.DOTALL)
        if not m:
            return None
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
