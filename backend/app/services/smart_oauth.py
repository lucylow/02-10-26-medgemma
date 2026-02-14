"""
SMART-on-FHIR OAuth2 token exchange.
Exchanges authorization code for access token at EHR token endpoint.
"""
import requests
from typing import Dict, Any, Optional

from app.core.config import settings
from app.core.logger import logger


def get_token_url(iss: str) -> str:
    """Resolve token URL from FHIR server iss (e.g. from .well-known/smart-configuration)."""
    base = iss.rstrip("/")
    return f"{base}/oauth2/token"


def exchange_code(
    token_url: str,
    code: str,
    client_id: str,
    redirect_uri: str,
    client_secret: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Exchange authorization code for access token.
    Returns token response (access_token, refresh_token, expires_in, etc.).
    """
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
    }
    if client_secret:
        data["client_secret"] = client_secret

    r = requests.post(
        token_url,
        data=data,
        headers={"Accept": "application/json"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()
