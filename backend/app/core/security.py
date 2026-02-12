# backend/app/core/security.py
import os
from fastapi import Header, HTTPException, Query, status, Depends
from app.core.config import settings

# In demo, use ADMIN_TOKEN env var or default (for Infra Dashboard)
_ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "demo-admin-token")


async def get_api_key_from_header_or_query(
    x_api_key: str = Header(None, alias="x-api-key"),
    api_key: str = Query(None),
):
    """Accept API key from header or query (for img src, etc.)."""
    key = x_api_key or api_key
    if not key or key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )
    return key


def admin_required(authorization: str = Header(None)):
    """
    Very small demo guard: expects 'Authorization: Bearer <token>'
    In production, verify OAuth tokens and user groups/roles.
    """
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer" or parts[1] != _ADMIN_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token or insufficient privileges")
    return {"actor": "admin_demo", "token": parts[1]}


async def get_api_key(x_api_key: str = Header(...)):
    if not x_api_key or x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key"
        )
    return x_api_key
