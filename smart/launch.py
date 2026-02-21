"""
SMART-on-FHIR launch entry point and token exchange.

Production launch is handled by the PediScreen backend (FastAPI):
  GET /smart/launch?iss=<fhir_server>&launch=<launch_token>
  GET /smart/callback?code=...&iss=...

This module provides a standalone exchange_code_for_token() for scripts or
services that perform the OAuth code exchange outside the main API (e.g. CLI, jobs).
"""
from __future__ import annotations

import os
from typing import Any, Dict, Optional

import requests

# Default from env (align with backend/app/core/config.py)
FHIR_BASE_URL = os.environ.get("EPIC_FHIR_SERVER_URL") or os.environ.get("FHIR_BASE_URL")
SMART_CLIENT_ID = os.environ.get("SMART_CLIENT_ID", "pediscreen-client")
SMART_CLIENT_SECRET = os.environ.get("SMART_CLIENT_SECRET")
SMART_REDIRECT_URI = os.environ.get("SMART_REDIRECT_URI", "http://localhost:8000/api/fhir/callback")
EPIC_TOKEN_URL = os.environ.get("EPIC_TOKEN_URL")


def _well_known_token_url(iss: str) -> Optional[str]:
    """Resolve token endpoint from .well-known/smart-configuration."""
    base = iss.rstrip("/")
    url = f"{base}/.well-known/smart-configuration"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
        return data.get("token_endpoint")
    except Exception:
        return None


def exchange_code_for_token(
    code: str,
    iss: Optional[str] = None,
    redirect_uri: Optional[str] = None,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Exchange authorization code for access token (SMART OAuth2).
    Returns dict with access_token, refresh_token, patient, etc.
    """
    iss = iss or FHIR_BASE_URL
    if not iss:
        raise ValueError("iss (FHIR server URL) or FHIR_BASE_URL required")
    redirect_uri = redirect_uri or SMART_REDIRECT_URI
    client_id = client_id or SMART_CLIENT_ID
    client_secret = client_secret or SMART_CLIENT_SECRET

    token_url = EPIC_TOKEN_URL or _well_known_token_url(iss)
    if not token_url:
        raise ValueError("Could not resolve token endpoint; set EPIC_TOKEN_URL or ensure .well-known/smart-configuration is available")

    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
    }
    if client_secret:
        payload["client_secret"] = client_secret

    headers = {"Accept": "application/json"}
    r = requests.post(token_url, data=payload, headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()


# Convenience for FastAPI-style usage: backend already implements this in app.api.fhir
def smart_launch(iss: str, launch: str) -> str:
    """
    Return the authorization URL to redirect the user to (EHR authorize endpoint).
    Caller should redirect the client to this URL.
    """
    from urllib.parse import urlencode

    base = iss.rstrip("/")
    # SMART: authorize endpoint from .well-known or default path
    auth_url = f"{base}/oauth2/authorize"
    params = {
        "response_type": "code",
        "client_id": SMART_CLIENT_ID,
        "redirect_uri": SMART_REDIRECT_URI,
        "scope": "launch openid fhirUser patient/*.read patient/Observation.write patient/DiagnosticReport.write",
        "state": launch,
        "launch": launch,
    }
    return f"{auth_url}?{urlencode(params)}"
