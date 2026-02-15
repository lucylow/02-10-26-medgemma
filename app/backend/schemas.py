"""
Pydantic schemas for API request/response validation
Enhanced for structured clinical report generation
"""

import os
from datetime import datetime
from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Optional, Dict, Any, Union
import re
from enum import Enum


class JobStatus(str, Enum):
    """Workflow states for Human-in-the-Loop enforcement"""
    CREATED = "created"
    QUEUED = "queued"
    RUNNING = "running"
    AI_COMPLETED = "ai_completed" # Legacy/Internal
    COMPLETED = "completed"
    REQUIRES_REVIEW = "requires_review"
    SIGNED_OFF = "signed_off"
    DELIVERED = "delivered"
    FAILED = "failed"


class IntakeRequest(BaseModel):
    """2.1 Intake Agent Request"""
    case_id: Optional[str] = Field(None, description="optional-uuid")
    age_months: int
    observations: str = ""
    consent: Dict[str, Any] = Field(..., description="{\"consent_id\":\"uuid\", \"raw_consent\": true}")
    image_url: Optional[str] = Field(None, description="signed-url-or-gs://")
    metadata: Optional[Dict[str, Any]] = None


class IntakeResponse(BaseModel):
    """2.1 Intake Agent Response"""
    case_id: str
    normalized: Dict[str, Any]
    schema_ver: str = "intake.v1"


class EmbeddingRequest(BaseModel):
    """2.2 Embedding Agent Request"""
    image_url: Optional[str] = None
    image_b64: Optional[str] = None


class EmbeddingResponse(BaseModel):
    """2.2 Embedding Agent Response"""
    model: str = "medsiglip-v1"
    embedding_b64: str
    shape: List[int] = [1, 256]
    quality_score: float = 0.0
    emb_version: str = "v1.0"


class VisionQARequest(BaseModel):
    """2.3 VisionQA Agent Request"""
    case_id: str
    image_url: str
    embedding: Optional[Dict[str, Any]] = None


class VisionQAResponse(BaseModel):
    """2.3 VisionQA Agent Response"""
    features: Dict[str, Any] = Field(default_factory=lambda: {"pincer_present": True, "handedness": "right", "sketch_density": 0.13})
    mask_url: Optional[str] = None
    confidence: float = 0.0


class TemporalCompareRequest(BaseModel):
    """2.4 Temporal Agent Request"""
    case_id: str
    embedding: Dict[str, Any]


class TemporalCompareResponse(BaseModel):
    """2.4 Temporal Agent Response"""
    delta_cosine: float
    stability: str
    history_count: int


class RetrieverRequest(BaseModel):
    """2.5 Retriever Agent Request"""
    embedding: Dict[str, Any]
    k: int = 3
    filters: Optional[Dict[str, Any]] = None


class RetrieverResponse(BaseModel):
    """2.5 Retriever Agent Response"""
    results: List[Dict[str, Any]]


class MedGemmaInferRequest(BaseModel):
    """2.6 MedGemma Agent Request"""
    case_id: str
    age_months: int
    observations: str
    features: Dict[str, Any]
    temporal: Dict[str, Any]
    examples: List[Dict[str, Any]] = Field(default_factory=list)


class SafetyCheckRequest(BaseModel):
    """2.7 Safety Agent Request"""
    case_id: str
    medgemma_output: Dict[str, Any]
    observations: str


class SafetyCheckResponse(BaseModel):
    """2.7 Safety Agent Response"""
    ok: bool
    reasons: List[str] = Field(default_factory=list)
    action: str = "ACCEPT"  # REJECT|ESCALATE|ACCEPT_WITH_NOTE


class ParentRewriteRequest(BaseModel):
    """2.9 Parent Agent Request"""
    medgemma_output: Dict[str, Any]
    language: str = "en"
    tone: str = "supportive"


class AuditEvent(BaseModel):
    """2.10 Audit Agent Event"""
    event_type: str
    case_id: Optional[str] = None
    details: Dict[str, Any]
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class WebhookRegistration(BaseModel):
    """Webhook registration request"""
    url: str
    secret: str
    clinic_id: str


class QuestionnaireScores(BaseModel):
    """Standardized assessment scores (e.g., ASQ-3)"""
    communication: Optional[float] = Field(None, description="Communication domain score")
    gross_motor: Optional[float] = Field(None, description="Gross motor domain score")
    fine_motor: Optional[float] = Field(None, description="Fine motor domain score")
    problem_solving: Optional[float] = Field(None, description="Problem solving domain score")
    personal_social: Optional[float] = Field(None, description="Personal-social domain score")
    total_score: Optional[float] = Field(None, description="Overall composite score")
    additional_scores: Optional[Dict[str, float]] = Field(None, description="Additional assessment scores")


class InferRequest(BaseModel):
    """Request schema for inference endpoint with enhanced multimodal support"""
    case_id: Optional[str] = Field(None, description="Client case id")
    age_months: int = Field(..., ge=0, le=72, description="Child age in months (0-72)")
    domain: str = Field("", description="Primary developmental domain (communication, gross_motor, fine_motor, cognitive, social)")
    observations: str = Field("", description="Caregiver/clinician observations (text)")
    image_b64: Optional[str] = Field(
        None, description="Base64-encoded raw image for MedSigLIP analysis"
    )
    embedding_b64: Optional[str] = Field(
        None, description="Base64-encoded float32 embedding bytes from MedSigLIP"
    )
    encrypted_embedding: Optional[Dict[str, str]] = Field(
        None, description="Client-side encrypted embedding: {eph_pub, nonce, cipher} in base64"
    )
    shape: Optional[List[int]] = Field(None, description="Embedding shape, e.g. [1,256]")
    questionnaire_scores: Optional[QuestionnaireScores] = Field(
        None, description="Standardized assessment scores"
    )
    visual_evidence_description: Optional[str] = Field(
        None, description="Description of visual evidence (drawing, video analysis)"
    )
    max_new_tokens: Optional[int] = Field(1024, ge=64, le=2048)
    temperature: Optional[float] = Field(0.1, ge=0.0, le=1.0)
    
    # Gemma 3 specific options
    use_gemma3_for_communication: bool = Field(False, description="Whether to use Gemma 3 for parent-friendly explanation and formatting")
    communication_params: Optional[Dict[str, Any]] = Field(
        None, 
        description="Parameters for Gemma 3 (language, tone, reading_level)"
    )
    # HITL Stage 0: Consent required before ANY AI reasoning (Page 3)
    consent: Optional[Dict[str, Any]] = Field(
        None,
        description="Consent record: {consent_id, consent_given, consent_scope}. Required for all screening.",
    )

    @root_validator
    def validate_consent_before_reasoning(cls, values):
        """HITL: No AI reasoning until consent is recorded. Required for all screening."""
        if os.getenv("CONSENT_REQUIRED_FOR_ALL", "1") != "1":
            return values  # Backward compat: allow bypass when env=0
        consent = values.get("consent")
        if not consent or not consent.get("consent_given"):
            raise ValueError(
                "Consent required before screening. Provide consent.consent_given=true and consent.consent_id."
            )
        if not consent.get("consent_id"):
            raise ValueError("consent_id required for audit trail.")
        return values

    @validator("image_b64")
    def validate_image_b64(cls, v):
        if v is not None:
            # Check if it's a valid base64 string
            pattern = re.compile(r'^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$')
            # Strip data URL prefix if present
            clean_v = v.split(',')[-1] if ',' in v else v
            if not pattern.match(clean_v):
                raise ValueError("image_b64 must be a valid base64 string")
        return v

    @validator("domain")
    def validate_domain(cls, v):
        allowed_domains = ["", "communication", "gross_motor", "fine_motor", "cognitive", "social"]
        if v.lower() not in allowed_domains:
            raise ValueError(f"domain must be one of {allowed_domains}")
        return v.lower()


class CommunicationRequest(BaseModel):
    """Request for Gemma 3 communication tasks"""
    clinical_summary: str = Field(..., description="The clinical summary to process")
    task: str = Field("rewrite_for_parents", description="rewrite_for_parents | clinician_note | follow_up_questions")
    params: Optional[Dict[str, Any]] = Field(None, description="Task-specific parameters")


class CommunicationResponse(BaseModel):
    """Response from Gemma 3 communication tasks"""
    success: bool
    output: Any
    task: str
    error: Optional[str] = None


class RiskStratification(BaseModel):
    """Detailed risk assessment"""
    level: str = Field("unknown", description="on_track | monitor | refer")
    primary_domain: str = Field("", description="Primary domain of concern")
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    rationale: str = Field("", description="Clinical reasoning for risk level")


class SupportingEvidence(BaseModel):
    """Evidence grounding for findings"""
    from_parent_report: List[str] = Field(default_factory=list)
    from_assessment_scores: List[str] = Field(default_factory=list)
    from_visual_analysis: List[str] = Field(default_factory=list)


class DevelopmentalProfile(BaseModel):
    """Comprehensive developmental profile"""
    strengths: List[str] = Field(default_factory=list)
    concerns: List[str] = Field(default_factory=list)
    milestones_met: List[str] = Field(default_factory=list)
    milestones_emerging: List[str] = Field(default_factory=list)
    milestones_not_observed: List[str] = Field(default_factory=list)


class Recommendations(BaseModel):
    """Prioritized recommendations"""
    immediate: List[str] = Field(default_factory=list)
    short_term: List[str] = Field(default_factory=list)
    long_term: List[str] = Field(default_factory=list)
    parent_friendly_tips: List[str] = Field(default_factory=list)


class ReferralGuidance(BaseModel):
    """Referral guidance with clinical justification"""
    needed: bool = False
    urgency: str = Field("routine", description="routine | priority | urgent")
    specialties: List[str] = Field(default_factory=list)
    reason: str = Field("", description="Clinical justification")


class FollowUp(BaseModel):
    """Follow-up recommendations"""
    rescreen_interval_days: int = Field(90, description="Days until next screening")
    monitoring_focus: List[str] = Field(default_factory=list)
    red_flags_to_watch: List[str] = Field(default_factory=list)


class EconomicImpact(BaseModel):
    """Economic impact estimate"""
    early_intervention_value: str = ""
    description: str = ""


class AuditLogEntry(BaseModel):
    """Immutable record of system and human actions"""
    timestamp: str
    action: str
    actor: str  # "system", "clinician_id", etc.
    details: Optional[str] = None
    previous_state: Optional[str] = None
    new_state: Optional[str] = None


class ClinicalSignOffRequest(BaseModel):
    """Request for clinical sign-off"""
    screening_id: str
    clinician_id: str
    clinician_name: str
    notes: Optional[str] = None
    edits: Optional[Dict[str, Any]] = Field(None, description="Human overrides for specific fields")
    approved_for_sharing: bool = Field(True, description="Mark approved for parent-facing delivery")


class RevisionEntry(BaseModel):
    """Single revision in technical report history"""
    timestamp: str
    actor: str
    actor_role: str
    action: str  # "ai_draft" | "clinician_edit" | "safety_rewrite" | "sign_off" | "parent_rewrite"
    field_changed: Optional[str] = None
    diff_summary: Optional[str] = None


class ProvenanceMeta(BaseModel):
    """Provenance for audit trail"""
    model_id: Optional[str] = None
    adapter_version: Optional[str] = None
    prompt_hash: Optional[str] = None
    input_snapshot_hash: Optional[str] = None


class TechnicalReport(BaseModel):
    """Technical report object with provenance and audit trail"""
    screening_id: str
    ai_draft: Dict[str, Any] = Field(default_factory=dict)
    clinician_reviewed: Dict[str, Any] = Field(default_factory=dict)
    revision_history: List[RevisionEntry] = Field(default_factory=list)
    provenance: ProvenanceMeta = Field(default_factory=ProvenanceMeta)
    parent_summary: Optional[str] = None
    parent_summary_generated_at: Optional[str] = None


class GenerateParentSummaryRequest(BaseModel):
    """Request to generate parent-facing summary (only after clinician sign-off)"""
    screening_id: str
    communication_params: Optional[Dict[str, Any]] = Field(
        None,
        description="tone, language, reading_level for Gemma 3",
    )

class JobResponse(BaseModel):
    """Response when a job is enqueued"""
    job_id: str
    case_id: str
    status: JobStatus
    poll_url: str
    timestamp: str

class AsyncJobStatus(BaseModel):
    """Status of an asynchronous job"""
    job_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    updated_at: float


class StructuredReport(BaseModel):
    """Complete structured clinical report"""
    risk_stratification: RiskStratification = Field(default_factory=RiskStratification)
    clinical_summary: str = ""
    parent_friendly_explanation: str = ""
    differential_considerations: List[str] = Field(default_factory=list)
    supporting_evidence: SupportingEvidence = Field(default_factory=SupportingEvidence)
    developmental_profile: DevelopmentalProfile = Field(default_factory=DevelopmentalProfile)
    recommendations: Recommendations = Field(default_factory=Recommendations)
    referral_guidance: ReferralGuidance = Field(default_factory=ReferralGuidance)
    follow_up: FollowUp = Field(default_factory=FollowUp)
    economic_impact: EconomicImpact = Field(default_factory=EconomicImpact)


class InferResponse(BaseModel):
    """Enhanced response schema with structured report and HITL status"""
    success: bool
    case_id: Optional[str] = None
    screening_id: str = ""
    timestamp: str = ""
    status: JobStatus = Field(JobStatus.REQUIRES_REVIEW, description="Current HITL state")
    
    # Structured report data
    report: Optional[StructuredReport] = None
    
    # Audit log (historical record)
    audit_log: List[AuditLogEntry] = Field(default_factory=list)
    
    # Legacy format for backward compatibility
    risk_assessment: Dict[str, Any] = Field(default_factory=dict)
    developmental_analysis: Dict[str, Any] = Field(default_factory=dict)
    clinical_summary: str = ""
    recommendations: Dict[str, List[str]] = Field(default_factory=dict)
    referral_guidance: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    inference_metadata: Dict[str, Any] = Field(default_factory=dict)
    evidence_grounding: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    ok: bool
    model: str
    adapter_loaded: bool
    device: str
    capabilities: List[str] = Field(
        default_factory=lambda: ["text_analysis", "structured_reports"]
    )


class AdapterUpdateRequest(BaseModel):
    """Request to update adapter"""
    adapter_source: str = Field(..., description="GCS URI or local path to adapter")
