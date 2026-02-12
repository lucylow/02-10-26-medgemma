"""
Clinician authentication using Google Identity (OAuth2 / IAP-style).
Protects sign-off endpoints with verifiable, auditable identity.
"""
from typing import Optional

from fastapi import Header, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

security = HTTPBearer()

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
CLINICIAN_EMAIL_DOMAIN = settings.CLINICIAN_EMAIL_DOMAIN or "@yourclinic.org"


def require_clinician(
    creds: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify Google-issued ID token. Return clinician info or raise 401/403.
    Only emails from CLINICIAN_EMAIL_DOMAIN are authorized.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clinician auth not configured (GOOGLE_CLIENT_ID required)",
        )

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google auth libraries not installed",
        )

    try:
        token = creds.credentials
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        email = info.get("email") or ""
        if not email.endswith(CLINICIAN_EMAIL_DOMAIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized clinician (email domain not allowed)",
            )
        return {
            "email": email,
            "name": info.get("name"),
            "sub": info.get("sub"),
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid identity token",
        )


def require_clinician_or_api_key(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    api_key: Optional[str] = Header(None, alias="x-api-key"),
) -> dict:
    """
    Accept either Bearer token (clinician) or x-api-key.
    For clinician dashboard: use Bearer. For programmatic: use x-api-key.
    """
    if creds and creds.credentials:
        return require_clinician(creds)  # type: ignore[arg-type]
    if api_key and api_key == settings.API_KEY:
        return {"email": "api-key", "name": None, "sub": None}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Bearer token or valid x-api-key required",
    )
