# Epic Production Pilot — Full Test Harness

This doc describes the test harness and safe fallback added for **Epic Production Pilot** readiness (SMART-on-FHIR, pediatric cohort, MedGemma inference, DiagnosticReport write-back, drift/bias/latency monitoring, fail-safe fallback).

## 1. Synthetic FHIR Bundle Generator

**Location:** `backend/tests/fhir_bundle_factory.py`

- **`generate_test_patient(patient_id, gender, birth_date, name?)`** — Builds a FHIR Patient dict (pediatric cohort).
- **`generate_test_patient_bundle(...)`** — Bundle (collection) with one Patient; use for API/validation tests.
- **`generate_test_observation(patient_id, observation_id, value_code, value_display)`** — Risk Observation for write-back tests.
- **`generate_test_diagnostic_report_bundle(patient_id, report_id, result_refs?)`** — DiagnosticReport (LOINC 56962-1) for write-back.
- **`generate_test_pediatric_cohort_bundle(patient_ids?, count?)`** — Multi-patient collection for batch/IRB-style tests.

Uses `fhir.resources` when available; falls back to plain dicts.  
**Tests:** `backend/tests/test_fhir_bundle_factory.py`

## 2. End-to-End SMART Flow Tests

**Location:** `backend/tests/test_smart_launch_flow.py`

- **`test_smart_launch_redirects_to_authorize`** — GET `/smart/launch` with `iss` + `launch` → 302 to EHR authorize URL.
- **`test_smart_callback_returns_access_token_on_mocked_exchange`** — GET `/smart/callback` with `code` + `iss` and mocked token exchange → 200 and `access_token` in JSON.
- **`test_smart_callback_missing_code_returns_400`** — Callback without `code` → 400.
- **`test_smart_callback_missing_iss_returns_400`** — Callback without `iss` (and no default) → 400.
- **`test_smart_launch_flow_integration`** — Full flow with mocked exchange → token in response.

Uses FastAPI `TestClient` and mocks `SMARTClient.exchange_code`; no live Epic/sandbox required.

## 3. Safe Fallback Guardrail

**Location:** `backend/app/services/safe_inference.py`

- **`psi_value()`** — Effective drift (PSI-like) from `monitoring.metrics.get_effective_drift_psi()` (relative shift of embedding norm mean vs baseline).
- **`bias_metric_violated()`** — Stub; set `SAFE_INFERENCE_BIAS_VIOLATED=1` to force fallback; can be wired to bias audit later.
- **`fallback_checklist(input_data)`** — Rule-based screening result (same shape as inference: `result`, `provenance`, `inference_time_ms`, `fallback_used`).
- **`safe_inference(medgemma_predict, *, drift_threshold=0.25, **input_kwargs)`** — If drift > threshold, bias violated, or OOM → returns `fallback_checklist`; else calls `medgemma_predict(**input_kwargs)`.

**Monitoring:** `monitoring/metrics.py` — `get_effective_drift_psi()` added; use `SAFE_INFERENCE_DRIFT_THRESHOLD` (default 0.25) to tune.

**Wiring:** When `EPIC_PILOT_SAFE_FALLBACK=true`, `backend/app/api/infer.py` runs inference through `safe_inference()` so drift, bias, or OOM triggers the rule-based checklist.

**Tests:** `backend/tests/test_safe_inference.py`

## 4. Mock Inference (infer endpoint)

**Location:** `backend/app/api/infer.py`

- **`_mock_inference(case_id)`** — Deterministic mock result when MedGemma is not configured (used by `MOCK_FALLBACK` and by safe-inference fallback shape).

## Go-Live Checklist (Epic Production Pilot)

- [ ] **SMART-on-FHIR:** `FHIR_BASE_URL`, `SMART_CLIENT_ID`, `SMART_CLIENT_SECRET`, `SMART_REDIRECT_URI` set; redirect URI matches Epic app config.
- [ ] **Pediatric cohort:** IRB approval; use synthetic bundles from `fhir_bundle_factory` for tests only.
- [ ] **MedGemma inference:** GPU pod / Vertex configured; run with `EPIC_PILOT_SAFE_FALLBACK=true` for guardrail.
- [ ] **DiagnosticReport write-back:** After inference, call `POST /api/fhir/report` with Bearer token and `patient_id`, `case_id`, `report` (risk_assessment, key_evidence, clinical_summary).
- [ ] **Drift:** Baseline set via `monitoring.metrics.set_baseline_mean()`; embedding norms recorded in `record_embedding()`; `get_effective_drift_psi()` &lt; threshold or fallback triggers.
- [ ] **Bias:** Wire `bias_metric_violated()` to periodic bias audit or set `SAFE_INFERENCE_BIAS_VIOLATED` for testing.
- [ ] **Latency:** Use `monitoring.metrics.record_inference_result()` and `get_avg_latency_ms()` (or Prometheus).
- [ ] **Fail-safe:** Confirm fallback checklist is used when drift &gt; 0.25, bias violated, or OOM (run `test_safe_inference.py`).
- [ ] **E2E:** Run `test_smart_launch_flow.py` and `test_fhir_bundle_factory.py` in CI; optional live SMART sandbox for manual launch/callback.

## Running the New Tests

From repo root with backend and monitoring on `PYTHONPATH`:

```bash
# Backend tests (from backend dir or with PYTHONPATH=backend:monitoring)
pytest backend/tests/test_fhir_bundle_factory.py backend/tests/test_smart_launch_flow.py backend/tests/test_safe_inference.py -v
```

If your environment has conflicting pytest plugins, use a dedicated venv with only this project’s dependencies.
