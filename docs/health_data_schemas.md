# Health Data Schemas & Validation (Pages 2–3)

This document describes the health data models, validation pipeline, and API endpoints added for clinical data quality and structured storage.

## Page 2: Data Model & Schema Refinement

### Pydantic Schemas (`backend/app/schemas/health_data.py`)

| Schema | Description |
|--------|-------------|
| `ASQDomainScores` | ASQ-3 domain scores (communication, gross_motor, fine_motor, problem_solving, personal_social), each 0–60 |
| `PEDSDomainScores` | PEDS domain scores (normalized 0–1) |
| `QuestionnaireScores` | Unified questionnaire (ASQ-3, PEDS, or custom normalized scores) |
| `ScreeningInput` | Canonical screening input: child_age_months, domain, observations, questionnaire_scores, consent_id |
| `PatientRecord` | Minimal PHI-safe patient context |
| `CHWClinicianNote` | Structured CHW/clinician note |
| `EmbeddingWithMetadata` | Embedding + provenance metadata (version, timestamp, consent_flag) |
| `ImageReference` | Abstracted image reference with consent_flag |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/screening` | Submit screening with JSON `ScreeningInput` (strongly typed) |
| GET | `/api/schemas/screening-input` | JSON Schema for ScreeningInput (frontend form generation) |
| GET | `/api/schemas/questionnaire-scores` | JSON Schema for QuestionnaireScores |
| GET | `/api/schemas/asq-domain-scores` | JSON Schema for ASQDomainScores |

### Example: POST /api/screening

```bash
curl -X POST "http://localhost:8000/api/screening" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "child_age_months": 24,
    "domain": "communication",
    "observations": "Child says about 10 words and points to pictures."
  }'
```

### Example: GET /api/schemas/screening-input

Returns JSON Schema suitable for frontend auto-generation of forms.

---

## Page 3: Ingestion Validation & Preprocessing Pipeline

### Central Preprocessor (`backend/app/services/health_data_preprocessor.py`)

- **Normalize text**: trim, Unicode NFC normalization
- **Validate numeric ranges**: age 0–240 months
- **Enforce required fields**: child_age_months, domain, observations
- **Consent handling**: require consent_flag/consent_id when images are included
- **Data quality report**: completeness_score, missing_fields, probability_of_noise

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data-quality/{case_id}` | Quality report for existing screening (case_id = screening_id) |
| POST | `/api/data-quality/validate` | Validate payload before submission; returns quality report |

### Example: POST /api/data-quality/validate

```bash
curl -X POST "http://localhost:8000/api/data-quality/validate" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "child_age_months": 24,
    "domain": "communication",
    "observations": "Child says about 15 words."
  }'
```

Response:
```json
{
  "completeness_score": 0.8,
  "missing_fields": [],
  "probability_of_noise": 0.1,
  "consent_present": false,
  "validation_errors": [],
  "warnings": [],
  "valid": true
}
```

### Example: GET /api/data-quality/{case_id}

Returns quality report for a stored screening. Use `screening_id` as `case_id`.

---

## Tests

Run schema and validation tests:

```bash
cd backend
pytest tests/test_health_data_schemas.py tests/test_screening_api.py tests/test_data_quality.py -v
```
