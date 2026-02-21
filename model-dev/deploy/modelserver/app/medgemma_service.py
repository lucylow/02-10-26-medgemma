"""
MedGemma/adapter inference wrapper for model-dev server.

Purpose: Back the /embed and /infer endpoints with mock or real model/FAISS.
Inputs: embed_image(case_id, image_b64, ...), infer_case(case_id, age_months, observations, embedding_b64, ...).
Outputs: Dict with embedding_b64/shape/emb_version for embed; text_summary, risk, recommendations, explainability for infer.

Usage: Used by app.main. Set env USE_REAL_MODEL=1 and LORA_ADAPTER_PATH / BASE_MODEL_ID for real load.
"""
from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Mock responses for dev and unit tests
MOCK_EMBEDDING_SHAPE = [1, 256]
MOCK_EMB_VERSION = "medsiglip-v1"
MOCK_ADAPTER_ID = "example_adapter"


def _decode_embedding_b64(embedding_b64: str) -> List[float]:
    """Decode base64 float32 embedding; return list of floats."""
    raw = base64.b64decode(embedding_b64)
    import struct
    n = len(raw) // 4
    return list(struct.unpack(f"{n}f", raw))


def _encode_embedding_b64(floats: List[float]) -> str:
    """Encode list of floats to base64 float32."""
    import struct
    raw = struct.pack(f"{len(floats)}f", *floats)
    return base64.b64encode(raw).decode("ascii")


class MedGemmaServiceWrapper:
    """Wrapper that uses mock or real model/adapter + optional FAISS explainability."""

    def __init__(
        self,
        use_real: bool = False,
        adapter_path: Optional[str] = None,
        base_model_id: Optional[str] = None,
        faiss_index_path: Optional[str] = None,
    ):
        self.use_real = use_real or os.environ.get("USE_REAL_MODEL", "").lower() in ("1", "true")
        self.adapter_path = adapter_path or os.environ.get("LORA_ADAPTER_PATH")
        self.base_model_id = base_model_id or os.environ.get("BASE_MODEL_ID", "google/medgemma-2b-it")
        self.faiss_index_path = faiss_index_path or os.environ.get("FAISS_INDEX_PATH")
        self._model = None
        self._tokenizer = None
        self._faiss_index = None
        self._faiss_metadata = None

    def _load_model_if_needed(self) -> None:
        if self._model is not None:
            return
        if not self.use_real or not self.adapter_path:
            return
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            from peft import PeftModel
            self._tokenizer = AutoTokenizer.from_pretrained(self.base_model_id or self.adapter_path, trust_remote_code=True)
            self._model = AutoModelForCausalLM.from_pretrained(
                self.base_model_id,
                device_map="auto",
                trust_remote_code=True,
            )
            if self.adapter_path and os.path.isdir(self.adapter_path):
                self._model = PeftModel.from_pretrained(self._model, self.adapter_path)
            logger.info("Loaded model and adapter from %s", self.adapter_path)
        except Exception as e:
            logger.warning("Real model load failed, using mock: %s", e)
            self.use_real = False

    def _load_faiss_if_needed(self) -> None:
        if self._faiss_index is not None or not self.faiss_index_path or not os.path.exists(self.faiss_index_path):
            return
        try:
            import faiss
            self._faiss_index = faiss.read_index(self.faiss_index_path)
            meta_path = self.faiss_index_path.replace(".faiss", "_metadata.json")
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    self._faiss_metadata = json.load(f)
            logger.info("Loaded FAISS index from %s", self.faiss_index_path)
        except Exception as e:
            logger.warning("FAISS load failed: %s", e)

    async def embed_image(
        self,
        case_id: str,
        image_b64: Optional[str] = None,
        image_ref: Optional[str] = None,
        shape_hint: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """Return embedding_b64, shape, emb_version. Mock: fixed-size random-like embedding."""
        # TODO: If use_real and image encoder loaded, run real embed
        import random
        dim = (shape_hint or MOCK_EMBEDDING_SHAPE)[-1] if shape_hint else MOCK_EMBEDDING_SHAPE[-1]
        rng = random.Random(hash(case_id) % (2**32))
        emb = [rng.gauss(0, 0.1) for _ in range(dim)]
        norm = (sum(x*x for x in emb)) ** 0.5
        if norm > 0:
            emb = [x / norm for x in emb]
        return {
            "embedding_b64": _encode_embedding_b64(emb),
            "shape": [1, dim],
            "emb_version": MOCK_EMB_VERSION,
        }

    async def infer_case(
        self,
        case_id: str,
        age_months: int,
        observations: str,
        embedding_b64: str,
        idempotency_key: Optional[str] = None,
        trace_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Return text_summary, risk, recommendations, model_version, adapter_id, explainability."""
        self._load_model_if_needed()
        self._load_faiss_if_needed()
        emb = _decode_embedding_b64(embedding_b64)
        explainability: Dict[str, Any] = {}
        if self._faiss_index is not None and self._faiss_metadata:
            import numpy as np
            D = self._faiss_index.d
            vec = np.array(emb[:D], dtype="float32").reshape(1, -1)
            k = min(3, self._faiss_index.ntotal)
            if k > 0:
                scores, indices = self._faiss_index.search(vec, k)
                neighbors = []
                for i, idx in enumerate(indices[0].tolist()):
                    if idx < 0:
                        continue
                    meta = self._faiss_metadata.get("items", [])
                    if idx < len(meta):
                        neighbors.append({
                            "id": meta[idx].get("id"),
                            "similarity": float(scores[0][i]),
                            "snippet": meta[idx].get("snippet", "")[:200],
                        })
                explainability["FAISS_neighbors"] = neighbors
        if self._model is not None and self._tokenizer is not None:
            # TODO: Build prompt and run generate; parse JSON from output
            pass
        # Mock response
        return {
            "text_summary": f"Summary for case {case_id} (age {age_months} months). Observations: {observations[:100]}...",
            "risk": "monitor",
            "recommendations": [
                "Discuss findings with your pediatrician.",
                "Complete follow-up screening if recommended.",
                "Keep a log of developmental milestones.",
            ],
            "model_version": "medgemma-adapter-v1",
            "adapter_id": MOCK_ADAPTER_ID,
            "explainability": explainability,
        }


# Singleton for app.main
medgemma_service = MedGemmaServiceWrapper()
