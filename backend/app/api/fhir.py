"""
SMART-on-FHIR OAuth endpoints for EHR launch context.
Enables real EHR launch (Epic, Cerner, Athena) with patient context.
"""
from fastapi import APIRouter, Request, Query
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.services.smart_oauth import exchange_code, get_token_url

router = APIRouter()

CLIENT_ID = settings.SMART_CLIENT_ID or "pediscreen-client"
REDIRECT_URI = settings.SMART_REDIRECT_URI or "http://localhost:8000/api/fhir/callback"
SCOPES = "launch/patient openid profile patient/Observation.write patient/DiagnosticReport.write"


@router.get("/api/fhir/launch")
async def fhir_launch(
    iss: str = Query(..., description="FHIR server issuer URL (e.g. Epic, Cerner)"),
    launch: str = Query(..., description="Launch token from EHR"),
):
    """
    Initiate SMART-on-FHIR authorization flow.
    Redirects to EHR authorize endpoint with launch context.
    """
    auth_url = f"{iss.rstrip('/')}/oauth2/authorize"
    params = (
        f"response_type=code"
        f"&client_id={CLIENT_ID}"
        f"&scope={SCOPES.replace(' ', '%20')}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&aud={iss}"
        f"&launch={launch}"
    )
    return RedirectResponse(url=f"{auth_url}?{params}")


@router.get("/api/fhir/callback")
async def fhir_callback(request: Request):
    """
    OAuth2 callback. Exchanges code for access token.
    Store token securely (session/db) for use with post_to_fhir.
    """
    code = request.query_params.get("code")
    if not code:
        return {"error": "missing_code", "detail": "Authorization code not provided"}

    iss = request.query_params.get("iss", "") or (settings.FHIR_BASE_URL or "")
    token_url = get_token_url(iss) if iss else ""
    if not token_url:
        return {"error": "missing_iss", "detail": "FHIR issuer URL required (iss param or FHIR_BASE_URL)"}

    try:
        token = exchange_code(
            token_url=token_url,
            code=code,
            client_id=CLIENT_ID,
            redirect_uri=REDIRECT_URI,
            client_secret=settings.SMART_CLIENT_SECRET,
        )
        # In production: store token in secure session or DB, keyed by user/session
        return {
            "access_token": token.get("access_token"),
            "token_type": token.get("token_type", "Bearer"),
            "expires_in": token.get("expires_in"),
            "scope": token.get("scope"),
            "patient": token.get("patient"),
        }
    except Exception as e:
        return {"error": "token_exchange_failed", "detail": str(e)}
