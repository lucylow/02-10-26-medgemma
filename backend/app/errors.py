# backend/app/errors.py
"""
Standardized error response schema for API consistency.
All API errors return this structure for predictable client handling.
"""
from typing import Optional

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Canonical error response schema for all API errors."""

    code: str = Field(..., description="Machine-readable error code for client logic")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(default=None, description="Optional extra context (e.g. field errors)")
    request_id: Optional[str] = Field(default=None, description="Request ID for support and log correlation")


class ErrorResponseEnvelope(BaseModel):
    """API error envelope: { \"error\": { code, message, details?, request_id? } }."""

    error: ErrorResponse


# Custom exception for structured API errors (use instead of HTTPException)
class ApiError(Exception):
    """Raise to return a standardized ErrorResponse. Handled by global exception handler."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[dict] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class SafetyViolation(Exception):
    """HAI-DEF: raised when clinical safety guard blocks output (toxicity, contraindication, low-confidence referral)."""

    def __init__(self, violation_type: str, severity: str, mitigation_applied: str):
        self.violation_type = violation_type
        self.severity = severity
        self.mitigation_applied = mitigation_applied
        super().__init__(f"Safety violation: {violation_type}")


# Standard error codes (extend as needed)
class ErrorCodes:
    INVALID_PAYLOAD = "INVALID_PAYLOAD"
    MODEL_LOAD_FAIL = "MODEL_LOAD_FAIL"
    EMBEDDING_ERROR = "EMBEDDING_ERROR"
    EMBEDDING_PARSE_ERROR = "EMBEDDING_PARSE_ERROR"
    EMBEDDING_SHAPE_MISMATCH = "EMBEDDING_SHAPE_MISMATCH"
    AUTH_FAIL = "AUTH_FAIL"
    INVALID_IMAGE = "INVALID_IMAGE"
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    INFERENCE_FAILED = "INFERENCE_FAILED"
    ANALYSIS_FAILED = "ANALYSIS_FAILED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    SAFE_ERROR = "SAFE_ERROR"  # Generic fallback for unhandled exceptions
    SAFETY_VIOLATION = "SAFETY_VIOLATION"  # HAI-DEF: toxicity, contraindication, low-confidence referral
