"""
SMART-on-FHIR OAuth endpoints for EHR launch context.
Enables real EHR launch (Epic, Cerner, Athena) with patient context.
Full SMART-compliant launch flow per HL7 spec.
"""
from fastapi import APIRouter, Request, Query
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.services.smart_oauth import SMARTClient, exchange_code, get_token_url

router = APIRouter()

CLIENT_ID = settings.SMART_CLIENT_ID or "pediscreen-client"
REDIRECT_URI = settings.SMART_REDIRECT_URI or "http://localhost:8000/api/fhir/callback"
# SMART spec: launch openid fhirUser for EHR context; patient/*.read for patient data
SCOPES = "launch openid fhirUser patient/*.read patient/Observation.write patient/DiagnosticReport.write"


@router.get("/api/fhir/launch")
async def fhir_launch(
    iss: str = Query(..., description="FHIR server issuer URL (e.g. Epic, Cerner)"),
    launch: str = Query(..., description="Launch token from EHR"),
):
    """
    Initiate SMART-on-FHIR authorization flow.
    Clinician clicks PediScreen AI inside EHR → EHR redirects here with iss + launch.
    Redirects to EHR authorize endpoint with full SMART-compliant params.
    """
    smart = SMARTClient(
        client_id=CLIENT_ID,
        redirect_uri=REDIRECT_URI,
    )
    return RedirectResponse(url=smart.authorize_url(iss, launch, scope=SCOPES))


@router.get("/api/fhir/callback")
async def fhir_callback(request: Request):
    """
    OAuth2 callback. Exchanges code for access token.
    Returns access_token, patient context, practitioner (fhirUser).
    In production: store token in secure session or DB, keyed by user/session.
    """
    code = request.query_params.get("code")
    if not code:
        return {"error": "missing_code", "detail": "Authorization code not provided"}

    iss = request.query_params.get("iss", "") or (settings.FHIR_BASE_URL or "")
    if not iss:
        return {"error": "missing_iss", "detail": "FHIR issuer URL required (iss param or FHIR_BASE_URL)"}

    state = request.query_params.get("state")

    try:
        smart = SMARTClient(
            client_id=CLIENT_ID,
            redirect_uri=REDIRECT_URI,
            client_secret=settings.SMART_CLIENT_SECRET,
        )
        token = smart.exchange_code(iss, code, state=state)
        # In production: store token in secure session or DB, keyed by user/session
        return {
            "access_token": token.get("access_token"),
            "token_type": token.get("token_type", "Bearer"),
            "expires_in": token.get("expires_in"),
            "scope": token.get("scope"),
            "patient": token.get("patient"),
            "practitioner": token.get("fhirUser"),
        }
    except Exception as e:
        return {"error": "token_exchange_failed", "detail": str(e)}


# Alternate SMART paths (Epic/Cerner/SMART Sandbox convention)
@router.get("/smart/launch")
async def smart_launch(
    iss: str = Query(..., description="FHIR server issuer URL"),
    launch: str = Query(..., description="Launch token from EHR"),
):
    """SMART launch entry point (alias for /api/fhir/launch)."""
    return await fhir_launch(iss=iss, launch=launch)


@router.get("/smart/callback")
async def smart_callback(request: Request):
    """SMART OAuth callback (alias for /api/fhir/callback)."""
    return await fhir_callback(request)
