"""
Structured audit log schema for AI inference and clinical operations.
All fields designed for regulatory compliance and tamper-evidence.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum


class AuditEventType(str, Enum):
    INFERENCE_RUN = "inference_run"
    CLINICAL_SIGN_OFF = "clinical_signoff"
    RAW_IMAGE_ACCESSED = "raw_image_accessed"
    AUDIT_EXPORT_REQUEST = "audit_export_request"
    CONSENT_RECORDED = "consent_recorded"
    ADAPTER_UPDATE = "adapter_update"
    ACCESS_DENIED = "access_denied"


class AuditRequestMeta(BaseModel):
    """Request metadata - hashed, no raw PHI"""
    prompt_hash: str = Field(..., description="SHA256 of prompt text")
    input_hash: str = Field(..., description="SHA256 of serialized input")
    adapter_id: Optional[str] = None
    model_id: str = "google/medgemma-2b-it"
    adapter_hash: Optional[str] = None
    adapter_commit: Optional[str] = None
    prompt_template_id: Optional[str] = None
    input_meta: Optional[Dict[str, Any]] = Field(None, description="Non-PHI metadata e.g. age_months, obs_length")


class AuditResponseMeta(BaseModel):
    """Response metadata - hashed, no raw PHI"""
    summary_hash: Optional[str] = None
    risk: Optional[str] = None
    confidence: Optional[float] = None
    explainability_refs: List[str] = Field(default_factory=list)
    inference_id: Optional[str] = None


class AuditLogEntry(BaseModel):
    """
    Canonical audit log entry schema.
    All inputs/outputs hashed; no raw PHI in logs.
    """
    event_id: str = Field(..., description="UUID for this event")
    event_type: str = Field(..., description="inference_run, clinical_signoff, etc.")
    actor_id: str = Field(..., description="User/service identifier")
    actor_role: str = Field(..., description="clinician, chworker, system_admin, etc.")
    resource_type: str = Field(default="case", description="case, screening, report, etc.")
    resource_id: Optional[str] = None
    timestamp: str = Field(..., description="ISO8601 UTC")
    request: Optional[AuditRequestMeta] = None
    response: Optional[AuditResponseMeta] = None
    outcome: Optional[str] = None
    client_ip: Optional[str] = None
    request_id: Optional[str] = None
    prev_hmac: Optional[str] = Field(None, description="HMAC of previous record for chaining")
    hmac: str = Field(..., description="HMAC of this record (chain)")

    class Config:
        extra = "forbid"
