import os
import json
from typing import List, Dict, Any

from .base import BaseAgent
from ..schemas.models import CasePayload, AgentResponse

try:
    import numpy as np
    import faiss  # type: ignore
    FAISS_AVAILABLE = True
except Exception:
    FAISS_AVAILABLE = False

INFRA_DIR = os.path.join("infra")
INDEX_PATH = os.path.join(INFRA_DIR, "faiss_index.bin")
META_PATH = os.path.join(INFRA_DIR, "faiss_meta.jsonl")

class RetrieverAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "RetrieverAgent"

    @property
    def role(self) -> str:
        return "Retrieval Agent (MiniLM / bge-small): Lightweight semantic recall for de-identified reference examples."

    def _ensure_infra(self):
        os.makedirs(INFRA_DIR, exist_ok=True)

    def _load_index(self, dim: int):
        if not FAISS_AVAILABLE:
            return None, []
        if os.path.exists(INDEX_PATH) and os.path.getsize(INDEX_PATH) > 0:
            index = faiss.read_index(INDEX_PATH)
        else:
            index = faiss.IndexFlatIP(dim)
        meta: List[Dict[str, Any]] = []
        if os.path.exists(META_PATH):
            with open(META_PATH, "r", encoding="utf-8") as fh:
                for line in fh:
                    try:
                        meta.append(json.loads(line))
                    except Exception:
                        continue
        return index, meta

    def _persist(self, index, meta: List[Dict[str, Any]]):
        if not FAISS_AVAILABLE:
            return
        faiss.write_index(index, INDEX_PATH)
        with open(META_PATH, "w", encoding="utf-8") as fh:
            for m in meta:
                fh.write(json.dumps(m) + "\n")

    async def process(self, payload: CasePayload) -> AgentResponse:
        # MiniLM / bge-small based retrieval
        # Role: Retrieve de-identified reference examples to provide contextual grounding (not evidence)
        
        self._ensure_infra()
        if not payload.embeddings:
            return AgentResponse(success=True, data={"examples": []}, log_entry="Retrieval Agent: No embeddings to retrieve against.")

        # MedSigLIP embeddings are 768-dim
        dim = 768
        
        if FAISS_AVAILABLE:
            # Real implementation would decode b64 -> np.float32 array
            query = np.zeros((1, dim), dtype="float32")
            index, meta = self._load_index(dim)
            if index is None or index.ntotal == 0 or not meta:
                return AgentResponse(success=True, data={"examples": []}, log_entry="Retrieval Agent: Index empty (MiniLM/bge-small mock).")
            
            D, I = index.search(query, 3)
            examples: List[Dict[str, Any]] = []
            for scores, idxs in zip(D, I):
                for s, i in zip(scores, idxs):
                    if 0 <= i < len(meta):
                        item = dict(meta[i])
                        item["_score"] = float(s)
                        examples.append(item)
            return AgentResponse(success=True, data={"examples": examples}, log_entry=f"Retrieval Agent: Found {len(examples)} de-identified examples.")
        else:
            # Fallback mock examples
            mock_examples = [
                {"case_id": "example-101", "age_months": 12, "description": "Similar pincer grasp pattern."},
                {"case_id": "example-202", "age_months": 13, "description": "Comparable fine motor developmental stage."}
            ]
            return AgentResponse(success=True, data={"examples": mock_examples}, log_entry="Retrieval Agent: Returning mock reference examples.")
