# backend/app/models/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Any

class EvidenceItem(BaseModel):
    type: str
    content: str
    influence: float

class Report(BaseModel):
    riskLevel: str
    confidence: float
    summary: str
    keyFindings: List[str]
    recommendations: List[str]
    evidence: List[EvidenceItem]
    analysis_meta: Optional[dict] = None

class AnalyzeResponse(BaseModel):
    success: bool
    screening_id: str
    report: Report
    timestamp: int

class ScreeningCreate(BaseModel):
    childAge: int
    domain: str
    observations: str
    image_path: Optional[str] = None
