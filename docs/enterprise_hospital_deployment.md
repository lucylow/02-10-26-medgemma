# Enterprise Hospital Deployment (Epic Production Rollout)

Production-oriented architecture and deployment for PediScreen AI with Epic EHR via SMART-on-FHIR: launch, patient context, AI inference (MedGemma + MedSigLIP), and FHIR write-back with hospital-grade logging.

## Architecture

```
Epic EHR
   ↓ (SMART launch: iss + launch)
PediScreen SMART App (React: /smart/launch, /smart/callback)
   ↓
Backend FHIR Proxy (FastAPI)
   ↓ SMART token exchange, GET Patient, POST DiagnosticReport + Observation
AI Inference (MedGemma + MedSigLIP) — existing /api/infer, /api/analyze
   ↓
FHIR Write-back (DiagnosticReport + Observation)
```

## Components

| Component | Purpose |
|-----------|--------|
| **SMART launch** | `GET /api/fhir/launch?iss=&launch=`, `GET /smart/launch` (frontend redirect) |
| **SMART callback** | `GET /api/fhir/callback?code=&state=&iss=` → token; frontend `/smart/callback` stores token, redirects to app |
| **FHIR proxy** | `GET /api/fhir/patient/{id}` (Bearer), `POST /api/fhir/report` (Bearer) — Epic as FHIR server |
| **Hospital logging** | Structured JSON: `correlation_id`, `action`, `duration_ms`, `status`, no PHI |
| **Write-back** | FHIR R4 DiagnosticReport (LOINC 56962-1) + Observation (risk level, evidence) |

## Configuration

Set in env or Kubernetes secrets/configmaps:

| Variable | Description |
|----------|-------------|
| `FHIR_BASE_URL` | FHIR server base (e.g. Epic R4 URL) |
| `EPIC_FHIR_SERVER_URL` | Override for Epic FHIR server (optional) |
| `EPIC_TOKEN_URL` | Override for Epic OAuth2 token endpoint (optional) |
| `SMART_CLIENT_ID` | Epic app client ID |
| `SMART_CLIENT_SECRET` | Epic app client secret |
| `SMART_REDIRECT_URI` | Must match Epic config; use frontend callback, e.g. `https://app.yourhospital.com/smart/callback` |

## Frontend (SMART)

- **Launch**: User opens app from Epic → EHR redirects to `https://app.../smart/launch?iss=...&launch=...` → app redirects to backend `GET /api/fhir/launch?iss=&launch=` → backend redirects to Epic authorize → user approves → Epic redirects to **callback**.
- **Callback**: Epic redirects to `https://app.../smart/callback?code=...&state=...&iss=...` → frontend calls backend `GET /api/fhir/callback?code=&state=&iss=` → receives `access_token`, `patient`, etc. → stores token in `sessionStorage` (no PHI in logs), redirects to `/pediscreen`.

Use `getStoredFhirToken()`, `getStoredFhirPatient()`, `getStoredFhirIss()` from `SmartCallback.tsx` when calling `/api/fhir/patient/{id}` or `/api/fhir/report` (send `Authorization: Bearer <token>`).

## API (FHIR Proxy)

- **GET /api/fhir/patient/{patient_id}**  
  Headers: `Authorization: Bearer <access_token>`.  
  Returns FHIR Patient from Epic. Hospital logging: `fhir_patient_get`, duration, no PHI.

- **POST /api/fhir/report**  
  Headers: `Authorization: Bearer <access_token>`.  
  Body: `{ "patient_id", "case_id", "report": { "risk_assessment", "key_evidence", "clinical_summary" }, "practitioner_ref?", "screening?" }`.  
  Posts Observation (risk) then DiagnosticReport with result references. Hospital logging: `fhir_report_write`.

- **GET /api/fhir/epic/health**  
  Light check that Epic proxy is configured (no FHIR call).

## Hospital-grade logging

- **Correlation ID**: Set from `X-Request-ID` or `X-Correlation-ID`; otherwise generated. Use for tracing across services.
- **Structured fields**: `action`, `status`, `duration_ms`, `error_code`, `patient_id_hash` (numeric hash only, no PHI).
- **Module**: `backend/app/core/hospital_logging.py` — `log_epic_action()`, `get_correlation_id()`, `set_correlation_id()`.

## Deployment

### Helm (recommended)

```bash
helm install pediscreen-epic ./helm/medgemma -f helm/medgemma/values.yaml -f helm/medgemma/values-epic.yaml
```

Override `existingSecret` and image in values-epic.yaml; set Epic/FHIR vars via that secret and configmaps.

### Standalone K8s snippet

See `k8s/epic-deployment.yaml` for a minimal Deployment (replicas 3, resources, env from secret/configMap). Create `pediscreen-epic-secrets` and `pediscreen-epic-config` accordingly.

## Test harness (pilot)

1. **Sandbox**: Use SMART Health IT Sandbox (`interop/vendors.yml` → `smart_sandbox`) with `FHIR_BASE_URL` and `SMART_REDIRECT_URI` pointing at your frontend callback URL.
2. **Launch**: Open `https://your-frontend/smart/launch?iss=<sandbox-iss>&launch=WzAsImY5OTU4...` (use sandbox launch picker to get `iss` and `launch`).
3. **Callback**: After auth, confirm redirect to `/pediscreen` and that `sessionStorage` has `pediscreen_fhir_token` and `pediscreen_fhir_patient`.
4. **Patient**: `curl -H "Authorization: Bearer <token>" "https://your-backend/api/fhir/patient/<patient_id>"`.
5. **Write-back**: POST to `/api/fhir/report` with same Bearer token and body containing `patient_id`, `case_id`, and `report` (risk_assessment, key_evidence, clinical_summary). Check Epic/sandbox for new DiagnosticReport and Observation.

## Integration with MedGemma + MedSigLIP

- Screening flow: use existing **/api/analyze** or **/api/infer** (embedding + metadata).  
- After inference, call **POST /api/fhir/report** with the same Bearer token and build `report` from inference result (risk_assessment, key_evidence, clinical_summary) to write back to Epic.

## Next steps

- **Epic production pilot**: Run full test harness against Epic sandbox; then go-live with one unit.
- **Federal / WHO**: See Federal Health AI (GovCloud) and Global Public Health (WHO-scale federation) specs for FIPS, FedRAMP, and federated learning.
