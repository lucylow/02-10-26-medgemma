"""
Health data schemas for PediScreen AI — Page 2: Data Model & Schema Refinement.
Strong Pydantic models for screening inputs, questionnaire scores, patient records,
CHW/clinician notes, embeddings, and image references.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator


# --- Questionnaire score domains ---

class ASQDomainScores(BaseModel):
    """ASQ-3 domain scores. Each domain 0–60 (10 items × 0–3)."""
    communication: int = Field(..., ge=0, le=60, description="Communication domain raw score")
    gross_motor: int = Field(..., ge=0, le=60, description="Gross motor domain raw score")
    fine_motor: int = Field(..., ge=0, le=60, description="Fine motor domain raw score")
    problem_solving: int = Field(..., ge=0, le=60, description="Problem solving domain raw score")
    personal_social: int = Field(..., ge=0, le=60, description="Personal-social domain raw score")


class PEDSDomainScores(BaseModel):
    """PEDS (Parents' Evaluation of Developmental Status) domain scores."""
    expressive_language: Optional[float] = Field(None, ge=0.0, le=1.0)
    receptive_language: Optional[float] = Field(None, ge=0.0, le=1.0)
    motor: Optional[float] = Field(None, ge=0.0, le=1.0)
    social_emotional: Optional[float] = Field(None, ge=0.0, le=1.0)
    school_readiness: Optional[float] = Field(None, ge=0.0, le=1.0)


class QuestionnaireType(str, Enum):
    ASQ_3 = "asq_3"
    PEDS = "peds"
    CUSTOM = "custom"


class QuestionnaireScores(BaseModel):
    """Unified questionnaire scores — supports ASQ-3, PEDS, or custom normalized scores."""
    questionnaire_type: QuestionnaireType = QuestionnaireType.ASQ_3
    asq_scores: Optional[ASQDomainScores] = None
    peds_scores: Optional[PEDSDomainScores] = None
    # Normalized 0–1 scores by domain (used by detailed writer, trajectory, etc.)
    normalized_scores: Optional[Dict[str, float]] = Field(
        default_factory=dict,
        description="Domain -> normalized score (0–1), e.g. communication: 0.3"
    )
    age_months_at_screening: Optional[int] = Field(None, ge=0, le=240)
    completed_at: Optional[datetime] = None

    @validator("normalized_scores")
    @classmethod
    def validate_normalized_scores(cls, v: Optional[Dict[str, float]]) -> Dict[str, float]:
        if not v:
            return {}
        for k, val in v.items():
            if not (0.0 <= val <= 1.0):
                raise ValueError(f"normalized_scores[{k}] must be 0–1, got {val}")
        return v


# --- Screening input ---

class ScreeningInput(BaseModel):
    """Canonical screening input for /api/analyze and screening workflows."""
    child_age_months: int = Field(..., ge=0, le=240, description="Child age in months")
    domain: str = Field(
        default="communication",
        description="Primary developmental domain (communication, motor, social, cognitive, etc.)"
    )
    observations: str = Field(default="", max_length=10000, description="Parent/caregiver observations")
    questionnaire_scores: Optional[QuestionnaireScores] = None
    image_path: Optional[str] = None
    consent_id: Optional[str] = None

    @validator("domain")
    @classmethod
    def domain_lower(cls, v: str) -> str:
        return (v or "communication").strip().lower()


# --- Patient record (minimal PHI-safe) ---

class PatientRecord(BaseModel):
    """Minimal patient record for screening context. PHI-safe identifiers only."""
    patient_id: Optional[str] = Field(None, max_length=128)
    screening_id: Optional[str] = None
    child_age_months: int = Field(..., ge=0, le=240)
    submitted_by: Optional[str] = Field(None, description="CHW or clinician pseudonym")
    created_at: Optional[datetime] = None


# --- CHW / Clinician note ---

class CHWClinicianNote(BaseModel):
    """Structured note from CHW or clinician."""
    author_id: str = Field(..., max_length=128)
    content: str = Field(..., max_length=5000)
    note_type: str = Field(default="clinical", description="clinical, administrative, follow_up")
    created_at: Optional[datetime] = None
    screening_id: Optional[str] = None
    report_id: Optional[str] = None


# --- Embedding + metadata ---

class EmbeddingMetadata(BaseModel):
    """Metadata for embedding provenance and audit."""
    embedding_version: str = Field(default="medsiglip-v1")
    capture_timestamp: Optional[float] = None
    device_type: Optional[str] = Field(None, max_length=64)
    consent_flag: bool = Field(default=False, description="Whether consent was obtained for image")
    model: Optional[str] = Field(None, max_length=64)


class EmbeddingWithMetadata(BaseModel):
    """Embedding payload with required metadata for health data traceability."""
    embedding_b64: str = Field(..., description="Base64-encoded float32 embedding")
    shape: List[int] = Field(default=[1, 256], description="Expected shape, e.g. [1, 256]")
    metadata: EmbeddingMetadata = Field(default_factory=EmbeddingMetadata)


# --- Image reference (abstracted, consent-flagged) ---

class ImageReference(BaseModel):
    """Abstracted image reference — no raw pixels, consent-flagged."""
    reference_id: str = Field(..., max_length=128)
    consent_flag: bool = Field(..., description="Explicit consent required")
    consent_id: Optional[str] = None
    size_bytes: Optional[int] = Field(None, ge=0)
    capture_age_months: Optional[int] = Field(None, ge=0, le=240)
    device_type: Optional[str] = None
    mime_type: Optional[str] = Field(None, max_length=32)


# --- JSON Schema export for frontend form generation ---

def get_screening_input_json_schema() -> dict:
    """Export JSON Schema for ScreeningInput so frontend can auto-generate forms."""
    return ScreeningInput.schema()


def get_questionnaire_scores_json_schema() -> dict:
    """Export JSON Schema for QuestionnaireScores."""
    return QuestionnaireScores.schema()


def get_asq_domain_scores_json_schema() -> dict:
    """Export JSON Schema for ASQDomainScores."""
    return ASQDomainScores.schema()
