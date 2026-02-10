from typing import List, Optional, Literal
from pydantic import BaseModel, Field

RiskLevel = Literal["low", "moderate", "elevated"]

class VisionSignal(BaseModel):
    embedding_id: str
    similarity_trend: Optional[str] = None
    variability_score: Optional[float] = None
    notes: Optional[str] = None

class ScreeningSummary(BaseModel):
    findings: List[str]
    risk_level: RiskLevel
    rationale: str
    suggested_next_steps: List[str]

class SafetyCheckResult(BaseModel):
    valid: bool
    issues: List[str] = []
    requires_human_review: bool = False

class ParentExplanation(BaseModel):
    text: str
    reading_level: str
    language: str = "en"

class AgentContext(BaseModel):
    case_id: str
    age_months: int
    vision: Optional[VisionSignal] = None
    screening: Optional[ScreeningSummary] = None
    parent_explanation: Optional[ParentExplanation] = None
    flags: List[str] = Field(default_factory=list)
