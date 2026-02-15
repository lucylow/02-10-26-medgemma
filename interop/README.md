# PediScreen AI — EHR Interoperability

Interoperability with Electronic Health Records using **FHIR R4**, **SMART on FHIR**, and common clinical workflows.

## Supported FHIR Versions

- **FHIR R4** (primary)

## Export Workflows

### 1. Export FHIR Bundle (GET)

```
GET /api/fhir/export_bundle/{case_id}?include_consent=true
```

Returns a FHIR transaction Bundle containing:
- **DocumentReference** — PDF report (LOINC 56962-1)
- **QuestionnaireResponse** — Screening inputs (age, domain, observations)
- **Observation** — Risk level (valueCodeableConcept)
- **Consent** (optional) — Patient consent for EHR sharing

### 2. Push to EHR (POST)

```
POST /api/fhir/push_bundle
Content-Type: application/json

{
  "case_id": "report-123",
  "fhir_base_url": "https://fhir.example.com/r4",
  "fhir_token": "Bearer ...",
  "consent_given": true
}
```

- Requires `consent_given: true`
- Uses retry logic with exponential backoff (3 attempts)
- Audit log: `ehr_export` event

### 3. EHR Export Status (GET)

```
GET /api/ehr/status/{export_id}
```

Returns push status, errors, and timestamps.

## Consent Requirements

Before sharing with EHR, the user must accept:

> *"By sharing this report to your electronic health record, you authorize transfer of pediatric screening information. Personal data will be stored in your health system's record. You may withdraw at any time."*

- Backend stores consent in `consent_records` and optionally as FHIR Consent in the bundle
- Export aborts if consent denied

## SMART on FHIR Launch

| Endpoint | Purpose |
|----------|---------|
| `GET /api/fhir/launch?iss=...&launch=...` | Initiate OAuth; redirects to EHR |
| `GET /api/fhir/callback?code=...&state=...` | Exchange code for token |

**PKCE:** Enabled by default for public clients. `code_challenge` and `code_verifier` are generated and stored per `state`.

**Config:** `SMART_CLIENT_ID`, `SMART_CLIENT_SECRET`, `SMART_REDIRECT_URI`, `FHIR_BASE_URL`

## Terminology Mapping

See [terminology_map.md](terminology_map.md) for LOINC, SNOMED, and custom codes.

## Example Payloads

### DocumentReference (excerpt)

```json
{
  "resourceType": "DocumentReference",
  "status": "current",
  "type": {"coding": [{"system": "http://loinc.org", "code": "56962-1", "display": "PediScreen AI Report"}]},
  "subject": {"reference": "Patient/123"},
  "content": [{"attachment": {"contentType": "application/pdf", "data": "<base64>", "title": "PediScreen AI Developmental Screening"}}]
}
```

### Observation (risk level)

```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "assessment"}]}],
  "code": {"coding": [{"system": "http://ai.pediscreen.org", "code": "risk-level"}]},
  "subject": {"reference": "Patient/123"},
  "valueCodeableConcept": {"coding": [{"system": "http://ai.pediscreen.org", "code": "medium"}]}
}
```

## Configuration

| Env Var | Purpose |
|---------|---------|
| `FHIR_BASE_URL` | FHIR server base (e.g. https://launch.smarthealthit.org/v/r4/fhir) |
| `SMART_CLIENT_ID` | OAuth client ID |
| `SMART_CLIENT_SECRET` | OAuth client secret (optional for public clients with PKCE) |
| `SMART_REDIRECT_URI` | OAuth callback URL |

Optional config file: `interop/fhir_config.yml` (copy to `fhir_config.local.yml` for overrides).

## EHR Vendors

See [vendors.yml](vendors.yml) for Epic, Cerner, Allscripts, SMART Sandbox, and HAPI FHIR configurations.

## Testing

```bash
# Conformance (requires FHIR_BASE_URL)
curl -H "x-api-key: dev-example-key" "http://localhost:8000/api/fhir/conformance"

# Export bundle
curl -H "x-api-key: dev-example-key" "http://localhost:8000/api/fhir/export_bundle/test-1"
```

## Postman Collection

Import `interop/postman/PediScreen-EHR-Integration.postman_collection.json` for manual testing. Includes: conformance, export bundle, PDF, HL7 v2, push, status, refresh token.

## Token Refresh

```
POST /api/fhir/refresh_token
{"iss": "https://fhir.example.com/r4", "refresh_token": "..."}
```

Returns new `access_token`, `expires_in`, `scope`. Use before token expiry for long-lived sessions.

## Frontend

Set `VITE_BACKEND_URL` (e.g. `http://localhost:8000`) so the EHR export button can reach the backend. Default in dev: `http://localhost:8000`. Export formats: FHIR (JSON), PDF, HL7 v2, Push to EHR.
