"""
Orchestrator schema contracts — synchronized with backend models and frontend types.
Per spec: strict Pydantic for API ↔ Orchestrator ↔ Agents.
"""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# --- Process case request/response ---

class ProcessCaseRequest(BaseModel):
    """Request for POST /process/case — full screening payload."""
    case_id: str = Field(..., min_length=1)
    child_age_months: int = Field(..., ge=0, le=72)
    domain: Literal["communication", "motor", "social", "cognitive"] = "communication"
    observations: str = Field(..., min_length=10)
    image_b64: Optional[str] = None
    role: Literal["parent", "chw", "clinician"] = "chw"
    consent_id: Optional[str] = None


class EmbeddingMetadata(BaseModel):
    """Output from Embedding Agent."""
    model: str = "medsiglip-v1"
    shape: List[int] = [1, 256]
    embedding_b64: Optional[str] = None


class TemporalAnalysis(BaseModel):
    """Output from Temporal Agent."""
    stability: Literal["unknown", "stable", "minor_change", "significant_change"] = "unknown"
    cosine_distance: Optional[float] = None
    history_count: int = 0


class SafetyStatus(BaseModel):
    """Output from Safety Agent."""
    ok: bool = True
    action: Literal["ACCEPT", "REJECT", "ESCALATE", "ACCEPT_WITH_NOTE"] = "ACCEPT"
    reasons: List[str] = Field(default_factory=list)


class ScreeningResultBlock(BaseModel):
    """Screening result block in ProcessCaseResponse."""
    risk_level: Literal["on_track", "monitor", "discuss", "refer"]
    confidence: float
    clinician_summary: str
    parent_summary: str
    rationale: List[str]
    recommendations: List[str]
    developmental_scores: Dict[str, float]
    model_id: str
    adapter_id: str
    prompt_version: str
    generated_at: datetime


class ProcessCaseResponse(BaseModel):
    """Full response from /process/case pipeline."""
    screening_result: ScreeningResultBlock
    embedding_metadata: EmbeddingMetadata
    temporal_analysis: TemporalAnalysis
    safety_status: SafetyStatus
