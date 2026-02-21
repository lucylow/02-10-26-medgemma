# backend/app/core/security.py
import os
import jwt
from fastapi import Header, Query, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import settings
from app.errors import ApiError, ErrorCodes

# In demo, use ADMIN_TOKEN env var or default (for Infra Dashboard)
_ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "demo-admin-token")

_http_bearer = HTTPBearer(auto_error=False)


def _decode_supabase_jwt(token: str) -> dict | None:
    """Decode and validate Supabase JWT. Returns payload or None if invalid."""
    secret = settings.SUPABASE_JWT_SECRET
    if not secret:
        return None
    try:
        return jwt.decode(
            token,
            secret,
            audience="authenticated",
            algorithms=["HS256"],
        )
    except jwt.PyJWTError:
        return None


async def get_api_key_or_supabase_user(
    x_api_key: str | None = Header(None, alias="x-api-key"),
    cred: HTTPAuthorizationCredentials | None = Depends(_http_bearer),
):
    """
    Accept either x-api-key (legacy) or Bearer JWT (Supabase).
    Returns (auth_type, user_id_or_key) for downstream use.
    """
    if x_api_key and x_api_key == settings.API_KEY:
        return {"type": "api_key", "user_id": None}
    if cred and cred.credentials:
        payload = _decode_supabase_jwt(cred.credentials)
        if payload:
            return {"type": "supabase", "user_id": payload.get("sub"), "email": payload.get("email")}
    raise ApiError(
        ErrorCodes.AUTH_FAIL,
        "Invalid or missing API Key or Bearer token",
        status_code=401,
    )


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


# For FHIR proxy: require EHR OAuth2 Bearer token (no decode; token is Epic/Cerner access_token)
_http_bearer_required = HTTPBearer(auto_error=True)


async def get_fhir_bearer_token(
    cred: HTTPAuthorizationCredentials = Depends(_http_bearer_required),
) -> str:
    """Require Authorization: Bearer <token> for FHIR/Epic proxy routes. Returns the access token."""
    return cred.credentials


async def get_api_key(
    x_api_key: str | None = Header(None, alias="x-api-key"),
    cred: HTTPAuthorizationCredentials | None = Depends(_http_bearer),
):
    """Accept x-api-key or Bearer JWT (Supabase). Returns auth identifier."""
    if x_api_key and x_api_key == settings.API_KEY:
        return x_api_key
    if cred and cred.credentials:
        payload = _decode_supabase_jwt(cred.credentials)
        if payload:
            return f"supabase:{payload.get('sub', '')}"
    raise ApiError(
        ErrorCodes.AUTH_FAIL,
        "Invalid or missing API Key or Bearer token",
        status_code=401,
    )
