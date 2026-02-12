# Automated Routine Medical Reports — Implementation Guide

This document describes the report generation flow added to the 02-10-26-medgemma architecture.

## Overview

- **Report generator**: Multimodal analysis → MedGemma synthesis → template population
- **PDF/HTML rendering**: Jinja2 + WeasyPrint for clinician/parent output
- **REST endpoints**: Draft generation, fetch, approve with human-in-the-loop sign-off
- **FHIR exporter**: Posts DiagnosticReport + Observations to EHR (SMART on FHIR)
- **MongoDB**: `reports` and `report_audit` collections for persistence
- **ClinicianReview**: React component to review/edit/sign-off drafts

## Architecture

1. **CHW submits screening** → `POST /api/analyze` → screening saved to `screenings` collection
2. **Generate report** → `POST /api/reports/generate?screening_id=...` → draft saved to `reports`
3. **Clinician reviews** → `ClinicianReview` fetches draft, edits summary/recommendations, signs off
4. **Approval** → `POST /api/reports/{id}/approve` → final_json persisted, PDF generated, optional FHIR export

## Backend Files

| File | Purpose |
|------|---------|
| `backend/app/services/report_generator.py` | Baseline skeleton + MedGemma synthesis, MongoDB persistence |
| `backend/app/services/pdf_renderer.py` | Jinja2 HTML template, WeasyPrint PDF generation |
| `backend/app/services/fhir_client.py` | FHIR DiagnosticReport + Observation posting |
| `backend/app/api/reports.py` | FastAPI router: generate, get, approve, list |

## Configuration (env vars)

| Variable | Description |
|----------|-------------|
| `API_KEY` | Required for all report endpoints (x-api-key header) |
| `HF_MODEL`, `HF_API_KEY` | Hugging Face for MedGemma synthesis (optional) |
| `VERTEX_*` | Vertex AI for MedGemma (optional) |
| `FHIR_BASE_URL` | FHIR server URL for EHR export (e.g. `https://fhir.example.com`) |
| `MONGO_URI`, `DB_NAME` | MongoDB connection (existing) |

## Frontend

- **`src/api/medgemma.ts`**: `getReport`, `generateReportFromScreening`, `approveReport` (extended)
- **`src/components/pediscreen/ClinicianReview.tsx`**: Fetches draft, editable clinical summary/recommendations, sign-off
- **`VITE_API_KEY`**: API key for backend (required for report endpoints)
- **`VITE_MEDGEMMA_API_URL`**: Backend base URL (e.g. `http://localhost:8000/api` when backend runs on 8000)

## Database

### MongoDB (current)

Collections are created automatically on first insert:

- **reports**: `report_id`, `screening_id`, `patient_info`, `draft_json`, `final_json`, `status`, `clinician_id`, `clinician_signed_at`, `created_at`
- **report_audit**: `report_id`, `action`, `actor`, `payload`, `created_at`

### PostgreSQL (Supabase migration)

If you migrate to Postgres, use `supabase/migrations/20250211010000_create_reports.sql`.

## WeasyPrint (PDF)

WeasyPrint requires system libraries. In Docker:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpango-1.0-0 libgdk-pixbuf2.0-0 libffi-dev libcairo2 \
    libpango1.0-dev libgdk-pixbuf2.0-dev shared-mime-info
```

If WeasyPrint is not installed, the PDF renderer returns a minimal placeholder PDF.

## Safety & Governance

- Human sign-off required before finalization
- `model_evidence` and `key_evidence` in drafts for audit
- `report_audit` for traceability
- PHI: follow `ALLOW_PHI` and local regulations (HIPAA, GDPR)

## Example End-to-End Flow

```bash
# 1. Submit screening (existing flow)
curl -X POST "http://localhost:8000/api/analyze" \
  -H "x-api-key: dev-example-key" \
  -F "childAge=24" \
  -F "domain=communication" \
  -F "observations=Child says about 10 words" \
  -F "image=@drawing.jpg"

# 2. Generate report
curl -X POST "http://localhost:8000/api/reports/generate" \
  -H "x-api-key: dev-example-key" \
  -F "screening_id=ps-1234567890-abc12345"

# 3. Approve (clinician)
curl -X POST "http://localhost:8000/api/reports/rpt-1234567890-xyz12345/approve" \
  -H "x-api-key: dev-example-key" \
  -F "clinician_id=dr.smith" \
  -F "sign_note=Reviewed and approved" \
  -F "send_to_ehr=false"
```
