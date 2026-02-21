"""
Orchestrator schema contracts — synchronized with backend models and frontend types.
Per spec: strict Pydantic for API ↔ Orchestrator ↔ Agents.
"""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# --- Memory & Reflection (PydanticAI-style) ---

class AgentMemory(BaseModel):
    """Stored agent memory for case/child context."""
    case_id: str
    agent_name: str
    session_id: str
    memory_type: Literal["short_term", "long_term", "reflection"] = "short_term"
    content: Dict[str, Any]
    confidence: float = Field(..., ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # TTL for short-term


class ReflectionLog(BaseModel):
    """Agent self-reflection audit log."""
    case_id: str
    agent_name: str
    reflection_type: Literal["self_critique", "error_analysis", "improvement"]
    input_summary: str
    output_summary: str
    critique: str
    confidence_change: float
    action_taken: Literal["adjust_confidence", "retry", "escalate", "proceed"]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MemoryAugmentedContext(BaseModel):
    """Context augmented with retrieved memory for agent execution."""
    current_case: Dict[str, Any]
    relevant_history: List[Dict[str, Any]] = []
    agent_memories: List[AgentMemory] = []
    reflections: List[ReflectionLog] = []
    longitudinal_trend: Optional[Dict[str, Any]] = None


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
    child_id: Optional[str] = None  # For longitudinal tracking across visits


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


class ScreeningReportWithMemory(ProcessCaseResponse):
    """Memory-augmented screening report with reflection audit trail."""
    memory_used: bool = False
    reflections: List[Dict[str, Any]] = Field(default_factory=list)
    longitudinal_insights: Optional[Dict[str, Any]] = None


# --- Agent request/response envelopes (multi-agent routing) ---

class ClientInfo(BaseModel):
    """Client identity for provenance."""
    app: str = ""
    version: str = ""
    user_id: Optional[str] = None


class ProvenanceInfo(BaseModel):
    """Provenance metadata for audit trail."""
    consent_id: Optional[str] = None
    submitted_at: Optional[datetime] = None


class AgentRequestEnvelope(BaseModel):
    """Standard JSON envelope for all agent calls (low-latency transport)."""
    request_id: str = Field(..., min_length=1)
    case_id: str = Field(default="")
    client: Optional[ClientInfo] = None
    task: str = Field(default="analyze_case", description="Semantic task name")
    capability: List[str] = Field(default_factory=list, description="Optional capability hints")
    priority: Literal["low", "normal", "high"] = "normal"
    timeout_ms: int = Field(default=5000, ge=100, le=120_000)
    payload: Dict[str, Any] = Field(default_factory=dict)
    provenance: Optional[ProvenanceInfo] = None


class AgentResponseEnvelope(BaseModel):
    """Standard agent response envelope for provenance and audit."""
    request_id: str
    agent_id: str
    model_version: str = ""
    adapter_id: str = ""
    response_ts: Optional[datetime] = None
    duration_ms: Optional[int] = None
    result: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence: List[str] = Field(default_factory=list)
    logs: Dict[str, List[str]] = Field(default_factory=lambda: {"warnings": [], "notes": []})
