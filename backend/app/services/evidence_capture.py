"""
Evidence capture for explainability: FAISS nearest neighbors, feature highlights.
Returns EvidenceItem list for InferenceExplainable schema.
"""
import json
import os
from typing import List, Optional

import numpy as np

from app.models.explainability_schema import EvidenceItem

# Optional FAISS
try:
    import faiss  # type: ignore
    FAISS_AVAILABLE = True
except Exception:
    FAISS_AVAILABLE = False

# Default paths (can be overridden via env)
INFRA_DIR = os.environ.get("FAISS_INFRA_DIR", "infra")
INDEX_PATH = os.path.join(INFRA_DIR, "faiss_index.bin")
META_PATH = os.path.join(INFRA_DIR, "faiss_meta.jsonl")
META_PKL_PATH = os.path.join(INFRA_DIR, "faiss_meta.pkl")


def _load_faiss_index(dim: int):
    """Load FAISS index and metadata. Returns (index, meta_list) or (None, [])."""
    if not FAISS_AVAILABLE:
        return None, []
    if not os.path.exists(INDEX_PATH) or os.path.getsize(INDEX_PATH) == 0:
        return None, []
    try:
        index = faiss.read_index(INDEX_PATH)
    except Exception:
        return None, []

    meta: List[dict] = []
    if os.path.exists(META_PATH):
        with open(META_PATH, "r", encoding="utf-8") as fh:
            for line in fh:
                try:
                    meta.append(json.loads(line.strip()))
                except Exception:
                    continue
    elif os.path.exists(META_PKL_PATH):
        try:
            import pickle
            with open(META_PKL_PATH, "rb") as fh:
                meta = pickle.load(fh)
        except Exception:
            meta = []

    return index, meta


def get_nearest_neighbor_evidence(
    embedding: np.ndarray,
    k: int = 5,
    dim: int = 256,
) -> List[EvidenceItem]:
    """
    Search FAISS for nearest neighbors and return EvidenceItem list.
    Embedding should be L2-normalized float32; FAISS IndexFlatIP uses inner product (= cosine if normalized).
    """
    index, meta = _load_faiss_index(dim)
    if index is None or index.ntotal == 0 or not meta:
        return []

    # Ensure correct shape and dtype
    emb = np.asarray(embedding, dtype=np.float32)
    if emb.ndim == 1:
        emb = emb.reshape(1, -1)
    if emb.shape[1] != dim:
        return []

    if FAISS_AVAILABLE:
        faiss.normalize_L2(emb)
        k = min(k, index.ntotal)
        scores, ids = index.search(emb, k)

        evidence_items: List[EvidenceItem] = []
        for i, (score, idx) in enumerate(zip(scores[0], ids[0])):
            if 0 <= idx < len(meta):
                m = meta[idx]
                case_id = m.get("id", m.get("case_id", f"nn-{idx}"))
                evidence_items.append(
                    EvidenceItem(
                        type="nearest_neighbor",
                        description=f"Similar case: {m.get('description', m.get('source', case_id))}",
                        reference_ids=[str(case_id)],
                        influence=float(score) if score <= 1.0 else 1.0,
                    )
                )
        return evidence_items

    return []


def extract_evidence_from_model_output(
    model_parsed: dict,
    nn_evidence: Optional[List[EvidenceItem]] = None,
) -> List[EvidenceItem]:
    """
    Combine model evidence (from explain, keyFindings) with nearest-neighbor evidence.
    """
    evidence: List[EvidenceItem] = list(nn_evidence or [])

    # From model explain field
    if model_parsed.get("explain"):
        evidence.append(
            EvidenceItem(
                type="text",
                description=str(model_parsed["explain"])[:500],
                reference_ids=[],
            )
        )

    # From model evidence list
    for ev in model_parsed.get("evidence", []):
        if isinstance(ev, dict):
            evidence.append(
                EvidenceItem(
                    type=ev.get("type", "text"),
                    description=ev.get("text", ev.get("description", str(ev)))[:500],
                    reference_ids=ev.get("reference_ids", []),
                    influence=ev.get("influence"),
                )
            )
        else:
            evidence.append(
                EvidenceItem(type="text", description=str(ev)[:500], reference_ids=[])
            )

    return evidence
