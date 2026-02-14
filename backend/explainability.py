"""
Explainability: FAISS index for nearest-neighbor retrieval.
Falls back to numpy cosine similarity if faiss not available.
"""
from typing import List, Optional, Tuple

try:
    import faiss
    _HAS_FAISS = True
except ImportError:
    _HAS_FAISS = False

import numpy as np


class EmbeddingIndex:
    """Index for embedding retrieval. Uses FAISS or numpy fallback."""

    def __init__(self, dim: int = 256):
        self.dim = dim
        self._index = None
        self._metadata: List[dict] = []
        self._vectors: Optional[np.ndarray] = None

    def add(self, embedding: np.ndarray, case_id: str, age_months: Optional[int] = None, notes: str = ""):
        """Add one embedding with metadata."""
        emb = np.asarray(embedding, dtype=np.float32)
        if emb.ndim == 1:
            emb = emb.reshape(1, -1)
        emb = emb / (np.linalg.norm(emb, axis=-1, keepdims=True) + 1e-12)

        if self._index is None:
            if _HAS_FAISS:
                self._index = faiss.IndexFlatIP(self.dim)
            else:
                self._vectors = emb
                self._metadata.append({"case_id": case_id, "age_months": age_months, "notes": notes})
                return
        elif not _HAS_FAISS:
            self._vectors = np.vstack([self._vectors, emb]) if self._vectors is not None else emb
            self._metadata.append({"case_id": case_id, "age_months": age_months, "notes": notes})
            return

        self._index.add(emb)
        self._metadata.append({"case_id": case_id, "age_months": age_months, "notes": notes})

    def get_nearest_neighbors(
        self, query_emb: np.ndarray, k: int = 3
    ) -> List[Tuple[str, float, dict]]:
        """
        Return k nearest neighbors as (case_id, score, metadata).
        Uses inner product for L2-normalized vectors (equivalent to cosine).
        """
        q = np.asarray(query_emb, dtype=np.float32)
        if q.ndim == 1:
            q = q.reshape(1, -1)
        q = q / (np.linalg.norm(q, axis=-1, keepdims=True) + 1e-12)

        if _HAS_FAISS and self._index is not None:
            scores, indices = self._index.search(q, min(k, len(self._metadata)))
            out = []
            for i, idx in enumerate(indices[0]):
                if idx >= 0 and idx < len(self._metadata):
                    meta = self._metadata[idx].copy()
                    meta["score"] = float(scores[0][i])
                    out.append((meta["case_id"], float(scores[0][i]), meta))
            return out

        if self._vectors is not None:
            sim = np.dot(self._vectors, q.T).flatten()
            top_k = np.argsort(-sim)[:k]
            return [
                (
                    self._metadata[i]["case_id"],
                    float(sim[i]),
                    {**self._metadata[i], "score": float(sim[i])},
                )
                for i in top_k
            ]

        return []
