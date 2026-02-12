# backend/app/models/report_schema.py
"""Single canonical schema for MedGemma Detailed Writer technical reports.
Used throughout: validation, API, rendering, audit.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class Citation(BaseModel):
    id: str
    text: str
    url: Optional[str] = None
    source_type: Optional[str] = "paper"  # paper, guideline, local_policy
    accessed_at: Optional[datetime] = None


class EvidenceItem(BaseModel):
    id: str
    type: str  # text, image, score, model_text, citation
    summary: str
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    citations: Optional[List[Citation]] = []
    provenance: Optional[Dict[str, Any]] = Field(default_factory=dict)


class DomainAssessment(BaseModel):
    domain: str
    rating: str  # typical, monitor, concern, unknown
    rationale: str
    quantitative_scores: Optional[Dict[str, float]] = Field(default_factory=dict)


class TechnicalReport(BaseModel):
    report_id: str
    screening_id: Optional[str] = None
    patient_id: Optional[str] = None
    author_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status: str  # draft, finalized, signed
    clinical_summary: str
    technical_summary: str  # detailed technical paragraph(s)
    parent_summary: str
    risk_assessment_overall: str  # low, medium, high, unknown
    domains: List[DomainAssessment]
    evidence: List[EvidenceItem]
    recommendations: List[str]
    citations: List[Citation]
    metadata: Dict[str, Any] = Field(default_factory=dict)
