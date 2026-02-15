"""
SMART-on-FHIR OAuth2 client for EHR launch (Epic, Cerner, SMART Sandbox).
Implements the full SMART launch flow per HL7 SMART App Launch spec.
Supports PKCE (code_challenge/code_verifier) for public clients.
"""
import hashlib
import secrets
import base64
import requests
from typing import Dict, Any, Optional, Tuple
from urllib.parse import urlencode

from app.core.config import settings
from app.core.logger import logger

# In-memory PKCE store (state -> verifier). Use Redis/DB in production.
_pkce_store: Dict[str, str] = {}


def generate_pkce() -> Tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge (S256)."""
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode("ascii")
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode("ascii")
    return challenge, verifier


def store_pkce_verifier(state: str, verifier: str) -> None:
    """Store code_verifier for later token exchange."""
    _pkce_store[state] = verifier


def get_pkce_verifier(state: str) -> Optional[str]:
    """Retrieve and clear code_verifier for state."""
    verifier = _pkce_store.pop(state, None)
    return verifier


def get_token_url(iss: str) -> str:
    """Resolve token URL from FHIR server iss (e.g. from .well-known/smart-configuration)."""
    base = iss.rstrip("/")
    return f"{base}/oauth2/token"


def _fetch_smart_configuration(iss: str) -> Optional[Dict[str, Any]]:
    """Fetch .well-known/smart-configuration for proper endpoint discovery."""
    base = iss.rstrip("/")
    url = f"{base}/.well-known/smart-configuration"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.debug("SMART configuration fetch failed: %s", e)
        return None


class SMARTClient:
    """
    SMART-on-FHIR OAuth client for EHR launch.
    Supports Epic, Cerner, Athena, and SMART Sandbox.
    """

    def __init__(
        self,
        client_id: Optional[str] = None,
        redirect_uri: Optional[str] = None,
        client_secret: Optional[str] = None,
    ):
        self.client_id = client_id or settings.SMART_CLIENT_ID or "pediscreen-client"
        self.redirect_uri = redirect_uri or settings.SMART_REDIRECT_URI or "http://localhost:8000/api/fhir/callback"
        self.client_secret = client_secret or settings.SMART_CLIENT_SECRET

    def authorize_url(
        self,
        iss: str,
        launch: str,
        scope: str = "launch openid fhirUser patient/*.read",
        state: Optional[str] = None,
        use_pkce: bool = True,
    ) -> str:
        """
        Build authorization URL for SMART launch.
        iss: FHIR server base URL (issuer)
        launch: Opaque launch context ID from EHR
        use_pkce: Add code_challenge for PKCE (recommended for public clients)
        """
        config = _fetch_smart_configuration(iss)
        auth_endpoint = (
            config.get("authorization_endpoint")
            if config
            else f"{iss.rstrip('/')}/oauth2/authorize"
        )

        state = state or secrets.token_urlsafe(16)
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": scope,
            "aud": iss.rstrip("/"),
            "launch": launch,
            "state": state,
        }
        if use_pkce:
            challenge, verifier = generate_pkce()
            store_pkce_verifier(state, verifier)
            params["code_challenge"] = challenge
            params["code_challenge_method"] = "S256"

        return f"{auth_endpoint}?{urlencode(params)}"

    def exchange_code(
        self,
        iss: str,
        code: str,
        redirect_uri: Optional[str] = None,
        state: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        Returns token response with access_token, patient, fhirUser, etc.
        If state provided and PKCE verifier stored, adds code_verifier.
        """
        config = _fetch_smart_configuration(iss)
        token_url = (
            config.get("token_endpoint")
            if config
            else f"{iss.rstrip('/')}/oauth2/token"
        )

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri or self.redirect_uri,
            "client_id": self.client_id,
        }
        if self.client_secret:
            data["client_secret"] = self.client_secret
        if state:
            verifier = get_pkce_verifier(state)
            if verifier:
                data["code_verifier"] = verifier

        res = requests.post(
            token_url,
            data=data,
            headers={"Accept": "application/json"},
            timeout=30,
        )
        res.raise_for_status()
        return res.json()

    def refresh_token(
        self,
        iss: str,
        refresh_token: str,
    ) -> Dict[str, Any]:
        """
        Refresh access token using refresh_token.
        Returns new access_token, expires_in, and optionally new refresh_token.
        """
        config = _fetch_smart_configuration(iss)
        token_url = (
            config.get("token_endpoint")
            if config
            else f"{iss.rstrip('/')}/oauth2/token"
        )
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.client_id,
        }
        if self.client_secret:
            data["client_secret"] = self.client_secret
        res = requests.post(
            token_url,
            data=data,
            headers={"Accept": "application/json"},
            timeout=30,
        )
        res.raise_for_status()
        return res.json()


def exchange_code(
    token_url: str,
    code: str,
    client_id: str,
    redirect_uri: str,
    client_secret: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Exchange authorization code for access token (legacy helper).
    Returns token response (access_token, refresh_token, expires_in, patient, fhirUser, etc.).
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
