"""
Canonical schema for AI explainability outputs.
All model responses must follow this structure for traceable, clinically meaningful inference.
Per design spec: AI Explainability & Trust — Human-Centered Design for Clinicians & Patients.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class EvidenceItem(BaseModel):
    """Single piece of evidence supporting the inference."""
    type: str = Field(
        ...,
        description="Evidence type: text, image_region, nearest_neighbor, questionnaire_score",
    )
    description: str = Field(..., description="Human-readable description of the evidence")
    reference_ids: List[str] = Field(
        default_factory=list,
        description="IDs referencing source (e.g., screening_id, neighbor_case_id)",
    )
    influence: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Relative influence on prediction (0-1)",
    )


class ModelProvenance(BaseModel):
    """Provenance metadata for model traceability."""
    adapter_id: Optional[str] = Field(None, description="LoRA adapter ID or path")
    model_id: str = Field(
        default="google/medgemma-2b-it",
        description="Base model identifier",
    )
    prompt_hash: Optional[str] = Field(None, description="SHA256 of prompt template")
    input_hash: Optional[str] = Field(None, description="SHA256 of serialized input")
    emb_version: Optional[str] = Field(None, description="Embedding encoder version")
    inference_time_ms: Optional[int] = Field(None, description="Inference latency in ms")


class InferenceExplainable(BaseModel):
    """
    Structured explainable inference output.
    API returns this schema by default for /api/infer.
    """
    summary: List[str] = Field(
        default_factory=list,
        description="Plain-language bullet summary (2-4 points)",
    )
    risk: str = Field(
        default="monitor",
        description="Risk level: low, monitor, high, refer",
    )
    confidence: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Model confidence in prediction (0-1)",
    )
    evidence: List[EvidenceItem] = Field(
        default_factory=list,
        description="Evidence items backing the prediction",
    )
    reasoning_chain: List[str] = Field(
        default_factory=list,
        description="Ordered step-by-step reasoning explanation",
    )
    model_provenance: Dict[str, str] = Field(
        default_factory=dict,
        description="adapter_id, model_id, prompt_hash, etc.",
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Clinical recommendations",
    )
    parent_text: Optional[str] = Field(
        None,
        description="Patient-friendly plain language summary",
    )
    case_id: Optional[str] = Field(None, description="Case identifier for audit")
