# AC — Access Control (NIST 800-53 Rev.5)

## AC-2 Account Management

- **Implementation:** RBAC via JWT (Supabase JWT secret, optional Google OAuth). Postgres RLS where applicable. Clinician email domain restriction (`CLINICIAN_EMAIL_DOMAIN`).
- **Artifacts:** `backend/app/core/config.py` (SUPABASE_JWT_SECRET, GOOGLE_CLIENT_ID), auth middleware, role checks in API routes.

## AC-3 Access Enforcement

- **Implementation:** Role-based middleware and API guards; PHI guard middleware blocks PHI from AI/telemetry routes; consent and DSR endpoints enforce access.
- **Artifacts:** `backend/app/middleware/phi_guard.py`, route-level `Depends(get_fhir_bearer_token)`, consent/dsr routers.

## AC-6 Least Privilege

- **Implementation:** SMART scopes limited to `launch openid fhirUser patient/*.read patient/Observation.write patient/DiagnosticReport.write`. Kubernetes service accounts with minimal RBAC.
- **Artifacts:** `backend/app/api/fhir.py` (SCOPES), K8s Role/RoleBinding in deploy charts.

## AC-7 Unsuccessful Logon Attempts

- **Implementation:** Handled by identity provider (Supabase/Google). API key validation and optional rate limiting at ingress.
- **Artifacts:** Auth provider configuration; nginx/ingress rate limits if enabled.

## AC-17 Remote Access

- **Implementation:** All API access over TLS; SMART-on-FHIR OAuth for EHR context; no PHI in application logs (hospital_logging, correlation IDs).
- **Artifacts:** `backend/app/core/hospital_logging.py`, SMART client, TLS on ingress.
