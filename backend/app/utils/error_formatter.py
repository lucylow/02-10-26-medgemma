# backend/app/utils/error_formatter.py
"""
Central error formatter for consistent API error responses.
Returns JSONResponse with standardized { error: { code, message, details?, request_id? } } schema.
"""
from typing import Optional

from fastapi.responses import JSONResponse

from app.errors import ErrorResponse, ErrorResponseEnvelope


def api_error(
    code: str,
    message: str,
    status_code: int = 400,
    details: Optional[dict] = None,
    request_id: Optional[str] = None,
) -> JSONResponse:
    """
    Build a standardized JSON error response.
    Client receives { "error": { "code", "message", "details?", "request_id?" } }.
    """
    body = ErrorResponse(
        code=code,
        message=message,
        details=details,
        request_id=request_id,
    )
    content = {"error": body.model_dump(exclude_none=True)}
    response = JSONResponse(status_code=status_code, content=content)
    if request_id:
        response.headers["X-Request-Id"] = request_id
    return response
