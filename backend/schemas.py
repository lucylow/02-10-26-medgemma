"""
Canonical Pydantic schemas for embedding and inference API contracts.
See docs/contracts.md for full JSON examples.
"""
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


# --- Consent ---
class ConsentSchema(BaseModel):
    consent_given: bool = True
    consent_id: Optional[str] = None


# --- Embedding ---
class ImageMeta(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    capture_ts: Optional[str] = None


class EmbeddingResponse(BaseModel):
    case_id: Optional[str] = None
    embedding_b64: str
    shape: List[int]
    emb_version: str = "medsiglip-v1"
    image_meta: Optional[ImageMeta] = None
    consent: Optional[ConsentSchema] = None
    client_app_version: Optional[str] = None


# --- Inference ---
class InferenceRequest(BaseModel):
    case_id: str
    age_months: int
    observations: str
    embedding_b64: str
    shape: List[int] = [1, 256]
    adapter_id: str = "pediscreen_v1"
    consent: ConsentSchema = Field(default_factory=lambda: ConsentSchema(consent_given=True))


class InferenceResult(BaseModel):
    summary: List[str] = Field(default_factory=list)
    risk: str = "monitor"
    recommendations: List[str] = Field(default_factory=list)
    parent_text: Optional[str] = None
    explain: Optional[str] = None
    confidence: float = 0.5
    adapter_id: Optional[str] = None
    model_id: Optional[str] = None
    raw_text: Optional[str] = None
    neighbors: Optional[List[dict]] = None


class InferenceResponse(BaseModel):
    case_id: str
    result: InferenceResult
    fallback_used: bool = False
    inference_ts: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
