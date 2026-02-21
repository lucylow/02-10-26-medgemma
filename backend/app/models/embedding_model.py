"""
Embedding layer: MedSigLIP or mock.
Produces normalized embedding from image/input for downstream reasoning.
"""
import base64
import hashlib
import logging
from typing import Any, Dict, List, Optional

from app.models.interface import BaseModel

logger = logging.getLogger(__name__)


class EmbeddingModel(BaseModel):
    """Base embedding model interface."""

    def infer(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Expects image_b64 or embedding_b64; returns embedding_b64, shape, emb_version."""
        raise NotImplementedError

    def health_check(self) -> bool:
        return True

    def metadata(self) -> Dict[str, Any]:
        return {"type": "embedding", "version": "v1"}


class MockEmbeddingModel(EmbeddingModel):
    """Deterministic mock embedding for dev/tests."""

    def __init__(self, dim: int = 256, emb_version: str = "medsiglip-v1-mock"):
        self.dim = dim
        self.emb_version = emb_version

    def infer(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Deterministic from case_id or first 64 chars of image_b64
        raw = (
            input_data.get("case_id", "")
            or (input_data.get("image_b64") or "")[:64]
            or "default"
        )
        seed = int(hashlib.sha256(raw.encode()).hexdigest()[:8], 16)
        import random
        rng = random.Random(seed)
        emb = [rng.gauss(0, 0.1) for _ in range(self.dim)]
        norm = (sum(x * x for x in emb)) ** 0.5
        if norm > 0:
            emb = [x / norm for x in emb]
        import struct
        b = struct.pack(f"{self.dim}f", *emb)
        embedding_b64 = base64.b64encode(b).decode("ascii")
        return {
            "embedding_b64": embedding_b64,
            "shape": [1, self.dim],
            "emb_version": self.emb_version,
        }

    def metadata(self) -> Dict[str, Any]:
        return {"type": "embedding", "version": self.emb_version, "mock": True}
