# HITL Workflow Implementation

This document describes the Human-in-the-Loop (HITL) implementation for PediScreen AI, aligned with the MedGemma Impact Challenge spec.

## Summary of Changes

### 1. Consent Gate (Stage 0)

**Files:** `app/backend/schemas.py`, `app/backend/main.py`, `app/backend/consent_utils.py`, `app/frontend/src/services/screeningApi.ts`

- **Consent required before AI reasoning:** All screening requests must include valid consent.
- **InferRequest:** `consent` is validated via `validate_consent_before_reasoning` (when `CONSENT_REQUIRED_FOR_ALL=1`, default).
- **consent_utils.py:** `validate_consent_for_screening()` validates structure and optionally verifies against consent store.
- **Frontend:** Passes `consent: { consent_id, consent_given, consent_scope }` with every screening request.

**Env vars:**
- `CONSENT_REQUIRED_FOR_ALL=1` (default) – enforce consent for all screening
- `SKIP_CONSENT_VERIFY=1` – skip DB verification of consent_id (for standalone inference server)

### 2. Gemma 3 Parent Rewrite After Sign-Off (Stage 3)

**Files:** `app/backend/main.py`, `app/frontend/src/services/screeningApi.ts`

- **Removed** Gemma 3 call from `/analyze` – parent-facing content is no longer generated during initial inference.
- **New endpoint:** `POST /api/generate-parent-summary`
  - Requires screening status `SIGNED_OFF`
  - Uses clinician-approved content (from technical report)
  - Calls Gemma 3 to rewrite for parents
  - Returns `parent_summary` with disclaimer: "Screening summary – not a diagnosis."
- **Frontend:** `generateParentSummary(screeningId, params)` – call after clinician sign-off.

### 3. Technical Report Object (Audit Trail)

**Files:** `app/backend/schemas.py`, `app/backend/main.py`

- **New schemas:** `TechnicalReport`, `RevisionEntry`, `ProvenanceMeta`
- **Stored per screening:** `technical_reports_db[screening_id]`
- **Contents:**
  - `ai_draft` – raw MedGemma output
  - `clinician_reviewed` – clinician-edited version
  - `revision_history` – who changed what, when (ai_draft, safety_rewrite, clinician_edit, sign_off, parent_rewrite)
  - `provenance` – model_id, adapter_version, prompt_hash
  - `parent_summary` – generated after sign-off
- **Endpoint:** `GET /api/technical-report/{screening_id}` – retrieve for audit.

### 4. Safety Agent Integration

**Files:** `app/backend/main.py`

- **After MedGemma parse:** `advanced_safety(parsed, observations)` runs.
- **On flags:** Escalates risk to "moderate" if needed; adds `safety_flags` to report.
- **Audit:** `safety_agent_flags` event logged when safety agent flags content.

### 5. Enhanced Audit Logging

**Files:** `app/backend/main.py`

- `safety_agent_flags` – when safety agent rewrites or flags
- `clinician_edits` – when clinician applies edits at sign-off
- `parent_summary_generated` – when Gemma 3 generates parent-facing content

### 6. Sign-Off with Revision History

**Files:** `app/backend/main.py`

- **Sign-off** records clinician edits in `technical_reports_db`
- **Revision entry** added for `clinician_edit` and `sign_off` actions
- **Edits** applied to screening report before persistence

## API Flow

```
1. POST /api/consent          → record consent (returns consent_id)
2. POST /api/analyze          → requires consent; returns REQUIRES_REVIEW
3. Clinician reviews/edits
4. POST /api/sign-off         → transitions to SIGNED_OFF
5. POST /api/generate-parent-summary → Gemma 3 rewrites for parents (only after sign-off)
6. GET /api/results/{id}      → deliver to parent (when SIGNED_OFF)
7. GET /api/technical-report/{id} → audit trail
```

## Backward Compatibility

- Set `CONSENT_REQUIRED_FOR_ALL=0` to allow requests without consent (legacy/demo).
- Frontend generates a placeholder consent when none provided (for demo when consent API unavailable).
