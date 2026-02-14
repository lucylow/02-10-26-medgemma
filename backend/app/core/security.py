# backend/app/core/security.py
import os
from fastapi import Header, Query, Depends
from app.core.config import settings
from app.errors import ApiError, ErrorCodes

# In demo, use ADMIN_TOKEN env var or default (for Infra Dashboard)
_ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "demo-admin-token")


async def get_api_key_from_header_or_query(
    x_api_key: str = Header(None, alias="x-api-key"),
    api_key: str = Query(None),
):
    """Accept API key from header or query (for img src, etc.)."""
    key = x_api_key or api_key
    if not key or key != settings.API_KEY:
        raise ApiError(
            ErrorCodes.AUTH_FAIL,
            "Invalid or missing API Key",
            status_code=401,
        )
    return key


def admin_required(authorization: str = Header(None)):
    """
    Very small demo guard: expects 'Authorization: Bearer <token>'
    In production, verify OAuth tokens and user groups/roles.
    """
    if not authorization:
        raise ApiError(
            ErrorCodes.AUTH_FAIL,
            "Missing Authorization header",
            status_code=401,
        )
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer" or parts[1] != _ADMIN_TOKEN:
        raise ApiError(
            ErrorCodes.AUTH_FAIL,
            "Invalid token or insufficient privileges",
            status_code=403,
        )
    return {"actor": "admin_demo", "token": parts[1]}


async def get_api_key(x_api_key: str = Header(...)):
    if not x_api_key or x_api_key != settings.API_KEY:
        raise ApiError(
            ErrorCodes.AUTH_FAIL,
            "Invalid or missing API Key",
            status_code=401,
        )
    return x_api_key
