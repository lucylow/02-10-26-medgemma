"""
Temporal Agent: fetches past embeddings for case_id, computes cosine distance vs previous visits.
Outputs: stability label (unknown|stable|minor_change|significant_change).
"""
import logging
from typing import Dict, List, Optional

logger = logging.getLogger("orchestrator.temporal")

# In-memory store for demo; replace with DB in production
_embedding_store: Dict[str, List[List[float]]] = {}


def _cosine_distance(a: List[float], b: List[float]) -> float:
    """Cosine distance = 1 - cosine_similarity."""
    if not a or not b or len(a) != len(b):
        return 1.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a < 1e-9 or norm_b < 1e-9:
        return 1.0
    sim = dot / (norm_a * norm_b)
    return max(0.0, 1.0 - sim)


def run_temporal(case_id: str, current_embedding: Optional[List[float]]) -> tuple:
    """
    Compute temporal stability. Returns (stability, cosine_distance, history_count).
    stability: "unknown" | "stable" | "minor_change" | "significant_change"
    """
    if not current_embedding:
        return "unknown", None, 0

    history = _embedding_store.get(case_id, [])
    if not history:
        return "unknown", None, 0

    prev = history[-1]
    dist = _cosine_distance(current_embedding, prev)

    if dist < 0.1:
        stability = "stable"
    elif dist < 0.3:
        stability = "minor_change"
    else:
        stability = "significant_change"

    return stability, dist, len(history)


def store_embedding(case_id: str, embedding: List[float]) -> None:
    """Store embedding for future temporal comparison."""
    if case_id not in _embedding_store:
        _embedding_store[case_id] = []
    _embedding_store[case_id].append(embedding)
    # Keep last 10
    if len(_embedding_store[case_id]) > 10:
        _embedding_store[case_id] = _embedding_store[case_id][-10:]
