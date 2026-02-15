"""
Strict Pydantic schemas for screening request/response per MedGemma pediatric screening spec.
ScreeningPayload and ScreeningResult define the canonical contract for API ↔ Orchestrator ↔ Agents.
"""
from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, confloat, conint, constr


# Risk levels per spec: screening-level only, no diagnoses
RiskLevel = Literal["on_track", "monitor", "discuss", "refer"]
UserRole = Literal["parent", "chw", "clinician"]


class ScreeningPayload(BaseModel):
    """Canonical screening input for AIModelManager.analyze_screening()."""
    case_id: str = Field(..., min_length=1, description="Unique case identifier")
    child_age_months: conint(ge=0, le=72) = Field(..., description="Child age in months (0-72)")
    domain: Literal["communication", "motor", "social", "cognitive"] = Field(
        default="communication",
        description="Primary developmental domain",
    )
    observations: constr(min_length=10) = Field(..., description="Caregiver/clinician observations (min 10 chars)")
    image_b64: Optional[str] = Field(None, description="Base64-encoded JPEG/PNG image")
    role: UserRole = Field(default="chw", description="User role for view tailoring")
    consent_id: Optional[str] = Field(None, description="Consent record ID if image provided")


class ScreeningResult(BaseModel):
    """Canonical screening output from AIModelManager.analyze_screening(). Fully populated."""
    risk_level: RiskLevel = Field(..., description="Screening-level risk; never a diagnosis")
    confidence: confloat(ge=0, le=1) = Field(..., description="Confidence score 0-1")
    clinician_summary: str = Field(..., description="Structured summary for clinicians")
    parent_summary: str = Field(..., description="Plain-language summary for parents")
    rationale: List[str] = Field(default_factory=list, description="Evidence-backed reasoning steps")
    recommendations: List[str] = Field(default_factory=list, description="Actionable next steps")
    developmental_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Domain scores (0-1) e.g. communication: 0.72",
    )
    model_id: str = Field(..., description="Model provenance: e.g. google/medgemma-2b-it")
    adapter_id: str = Field(default="", description="LoRA adapter ID if used")
    prompt_version: str = Field(default="v1", description="Prompt template version")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Generation timestamp")


def map_legacy_risk_to_spec(legacy: str) -> RiskLevel:
    """Map legacy riskLevel (low/medium/high) to spec risk_level."""
    m = {"low": "on_track", "medium": "monitor", "high": "discuss", "refer": "refer"}
    return m.get(legacy.lower(), "monitor")
