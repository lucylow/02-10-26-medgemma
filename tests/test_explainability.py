"""Tests for backend.explainability FAISS/numpy index."""
import numpy as np
import pytest

from backend.explainability import EmbeddingIndex


def test_embedding_index_add_and_search():
    idx = EmbeddingIndex(dim=4)
    e1 = np.array([[0.5, 0.5, 0.5, 0.5]], dtype=np.float32)
    e2 = np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32)
    e3 = np.array([[0.0, 1.0, 0.0, 0.0]], dtype=np.float32)
    idx.add(e1, "case-1", age_months=24, notes="a")
    idx.add(e2, "case-2", age_months=36, notes="b")
    idx.add(e3, "case-3", age_months=12, notes="c")

    # Query similar to e1
    q = np.array([[0.5, 0.5, 0.5, 0.5]], dtype=np.float32)
    neighbors = idx.get_nearest_neighbors(q, k=2)
    assert len(neighbors) >= 1
    case_ids = [n[0] for n in neighbors]
    assert "case-1" in case_ids
