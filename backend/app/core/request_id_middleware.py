"""
Request ID middleware — attach X-Request-Id to every request and response.
Enables log correlation and support; clients can send X-Request-Id and get it back in responses.
"""
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Set request.state.request_id from X-Request-Id header or generate UUID; add to response headers."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


def get_request_id(request: Request) -> str:
    """Return request_id from request state (set by RequestIDMiddleware)."""
    return getattr(request.state, "request_id", "")
