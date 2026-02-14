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
