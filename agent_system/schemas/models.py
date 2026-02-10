from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ImageInput(BaseModel):
    id: str
    uri: str
    capture_ts: str

class QuestionnaireInput(BaseModel):
    asq_responses: Dict[str, Any] = Field(default_factory=dict)

class CaseInputs(BaseModel):
    images: List[ImageInput] = Field(default_factory=list)
    questionnaire: QuestionnaireInput = Field(default_factory=QuestionnaireInput)

class EmbeddingData(BaseModel):
    image_id: str
    model: str
    shape: List[int]
    b64: str
    quality_score: float = 1.0  # 0.0 to 1.0

class MedGemmaOutput(BaseModel):
    summary: List[str]
    risk: str  # low | monitor | elevated
    confidence: float
    adapter_id: str
    model_version: str
    rationale_bullets: List[str] = Field(default_factory=list) # "why this was flagged"
    evidence_ids: List[str] = Field(default_factory=list) # IDs of images/features used
    next_steps: List[str] = Field(default_factory=list)
    ui_advisory: str = "Advisory only. Clinician confirmation required."
    rationale: str = "" # Added for structured reasoning

class ParentCommunicationOutput(BaseModel):
    parent_summary: str
    tone: str = "reassuring"
    language: str = "en"
    reading_level: str = "grade-8"

class EdgeOutput(BaseModel):
    local_embeddings: List[EmbeddingData] = Field(default_factory=list)
    offline_mode: bool = False

class CasePayload(BaseModel):
    case_id: str
    client_version: str
    consent_id: str
    age_months: int
    inputs: CaseInputs
    embeddings: List[EmbeddingData] = Field(default_factory=list)
    features: Dict[str, Any] = Field(default_factory=dict)
    temporal: Dict[str, Any] = Field(default_factory=dict)
    medgemma_output: Optional[MedGemmaOutput] = None
    parent_communication: Optional[ParentCommunicationOutput] = None
    edge_output: Optional[EdgeOutput] = None
    status: str = "pending"
    logs: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict) # Technical and Clinical metrics

class AgentResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    log_entry: Optional[str] = None
