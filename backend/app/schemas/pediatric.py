"""
HAI-DEF clinical data contracts for pediatric screening.
Ironclad validation: ASQ-3 domains, age-stratified cutoffs, consent, schema enforcement.
"""
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, validator


def get_age_cutoffs(age_months: int) -> Dict[str, int]:
    """
    ASQ-3 age-stratified domain cutoffs (minimum pass score per domain).
    Values from standard ASQ-3 cutoffs; 0 allows any score when band not defined.
    """
    # Simplified bands: 0-8, 9-11, 12-17, 18-23, 24-29, 30-35, 36-41, 42-47, 48-60
    if age_months < 9:
        return {"communication": 0, "gross_motor": 0, "fine_motor": 0, "problem_solving": 0, "personal_social": 0}
    if age_months < 12:
        return {"communication": 2, "gross_motor": 2, "fine_motor": 2, "problem_solving": 2, "personal_social": 2}
    if age_months < 18:
        return {"communication": 4, "gross_motor": 4, "fine_motor": 4, "problem_solving": 4, "personal_social": 4}
    if age_months < 24:
        return {"communication": 6, "gross_motor": 6, "fine_motor": 6, "problem_solving": 6, "personal_social": 6}
    if age_months < 36:
        return {"communication": 8, "gross_motor": 8, "fine_motor": 8, "problem_solving": 8, "personal_social": 8}
    # 36-60 months
    return {"communication": 10, "gross_motor": 10, "fine_motor": 10, "problem_solving": 10, "personal_social": 10}


class ASQ3Domain(BaseModel):
    """ASQ-3 domain scores; each 0-60 per standard."""

    communication: int = Field(..., ge=0, le=60)
    gross_motor: int = Field(..., ge=0, le=60)
    fine_motor: int = Field(..., ge=0, le=60)
    problem_solving: int = Field(..., ge=0, le=60)
    personal_social: int = Field(..., ge=0, le=60)


class ScreeningInput(BaseModel):
    """Canonical screening request: age, ASQ-3 scores, optional embedding, consent."""

    child_age_months: int = Field(..., ge=0, le=60)
    asq_scores: ASQ3Domain
    parental_concerns: Optional[str] = None
    domain_focus: Literal["communication", "motor", "all"] = "all"
    embedding_b64: Optional[str] = None  # MedSigLIP
    chw_id: str
    consent_given: bool = Field(..., description="HIPAA/GDPR consent")

    @validator("asq_scores")
    def validate_asq_ranges(cls, v: ASQ3Domain, values: Dict[str, Any]) -> ASQ3Domain:
        age = values.get("child_age_months")
        if age is not None:
            cutoffs = get_age_cutoffs(age)
            d = v.dict()
            for domain, score in d.items():
                if domain in cutoffs and score < cutoffs[domain]:
                    raise ValueError(
                        f"{domain} below cutoff {cutoffs[domain]} for age {age}mo"
                    )
        return v


class RiskOutput(BaseModel):
    """HAI-DEF screening result: risk level, calibrated probability, evidence, provenance."""

    risk_level: Literal["referral", "urgent", "monitor", "ontrack"]
    clinical_probability: float = Field(..., ge=0.0, le=1.0)  # Platt calibrated
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning_steps: List[str] = Field(default_factory=list)
    evidence: List[dict] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    adapter_ensemble: List[str] = Field(default_factory=list)
    model_provenance: dict = Field(default_factory=dict)

    def summary_text(self) -> str:
        """Concatenated text for safety checks (reasoning + recommendations)."""
        parts = list(self.reasoning_steps) + list(self.recommendations)
        return " ".join(str(p) for p in parts if p)


class SafetyViolationSchema(BaseModel):
    """Schema for reporting a safety violation (no diagnosis, toxicity, low-confidence referral)."""

    violation_type: Literal["toxicity", "contraindication", "low_confidence_referral", "age_inappropriate"]
    severity: Literal["critical", "high", "medium"]
    mitigation_applied: str
