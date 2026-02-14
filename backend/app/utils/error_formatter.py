# backend/app/utils/error_formatter.py
"""
Central error formatter for consistent API error responses.
Returns JSONResponse with standardized {code, message, details} schema.
"""
from typing import Optional

from fastapi.responses import JSONResponse

from app.errors import ErrorResponse


def api_error(
    code: str,
    message: str,
    status_code: int = 400,
    details: Optional[dict] = None,
) -> JSONResponse:
    """
    Build a standardized JSON error response.

    Args:
        code: Machine-readable error code (e.g. INVALID_PAYLOAD, EMBEDDING_ERROR)
        message: Human-readable error message
        status_code: HTTP status code (default 400)
        details: Optional extra context (e.g. {"field": "age_months", "expected": "0-240"})

    Returns:
        JSONResponse with ErrorResponse schema
    """
    body = ErrorResponse(code=code, message=message, details=details)
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(exclude_none=True),
    )
