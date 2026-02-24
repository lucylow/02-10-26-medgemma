"""Strict request/response dataclasses for screening in, structured JSON out."""
from dataclasses import dataclass, field
from typing import List, Optional, Any


@dataclass
class ScreeningRequest:
    """Input for one screening call. Embedding-first, privacy-by-design."""
    age_months: int
    observations: str = ""
    embedding_b64: str = ""
    shape: List[int] = field(default_factory=lambda: [1, 256])
    emb_version: str = "medsiglip-v1"
    case_id: Optional[str] = None
    domain: str = ""
    questionnaire_scores: Optional[dict] = None
    visual_evidence: Optional[str] = None


@dataclass
class ScreeningResponse:
    """Structured output from MedGemma screening."""
    risk: str  # e.g. "low" | "moderate" | "elevated"
    recommendations: List[str] = field(default_factory=list)
    confidence: float = 0.5
    adapter_id: Optional[str] = None
    model_id: Optional[str] = None
    evidence: List[Any] = field(default_factory=list)
    reasoning_chain: List[str] = field(default_factory=list)
    clinical_summary: Optional[str] = None
    raw_json: Optional[dict] = None
    inference_time_s: float = 0.0
    fallback_used: bool = False
