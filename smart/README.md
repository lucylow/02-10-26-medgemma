# SMART-on-FHIR (Epic / Cerner) Integration

PediScreen AI launches from the EHR and uses SMART OAuth to access FHIR APIs.

## Flow

1. **EHR launches PediScreen** → GET `/smart/launch?iss=<FHIR server>&launch=<token>`
2. **Backend redirects** to EHR authorize URL (from `.well-known/smart-configuration`)
3. **User authorizes** → EHR redirects to `/smart/callback?code=...&iss=...`
4. **Backend exchanges code for token** → returns `access_token`, `patient`, `fhirUser`
5. **FHIR API calls** use `Authorization: Bearer <access_token>`

## Backend Endpoints

- **Launch:** `GET /smart/launch` and `GET /api/fhir/launch` (see `backend/app/api/fhir.py`)
- **Callback:** `GET /smart/callback` and `GET /api/fhir/callback`
- **Patient:** `GET /api/fhir/patient/{id}` (Epic proxy, Bearer token required)
- **Write-back:** `POST /api/fhir/report` (DiagnosticReport + Observations)

## Standalone Helpers

For scripts or external services that already have an access token:

- `smart/fhir_helpers.py`: `get_patient(patient_id, token)`, `push_observation(observation, token)`
- Set `FHIR_BASE_URL` (or `EPIC_FHIR_SERVER_URL`) to your FHIR server.

## Config

- `FHIR_BASE_URL`, `SMART_CLIENT_ID`, `SMART_CLIENT_SECRET`, `SMART_REDIRECT_URI`
- Epic: `EPIC_FHIR_SERVER_URL`, `EPIC_TOKEN_URL` (optional overrides)
