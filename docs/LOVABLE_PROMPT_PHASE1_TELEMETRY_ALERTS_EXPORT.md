# Phase 1 Implementation Prompt — Enhanced Telemetry, Alerts & Export (Lovable / Cursor)

**Repository:** `lucylow/02-10-26-medgemma` (PediScreen AI / MedGemma)  
**Goal:** One sprint to implement enhanced telemetry schema, rich event envelope, Prometheus metrics & alerts, CSV/JSON export APIs, and dashboard plumbing.

---

## 1. Overview

Deliver **Phase 1** in one go:

1. **Enhanced telemetry schema** — New `ai_events` table with full event envelope (model, latency, cost, fallback tracking, provenance, request_id).
2. **Instrumentation** — Wire the existing **analyze** and **infer** flows to emit rich telemetry to DB and Prometheus (keep current `log_inference_audit` for backward compatibility; add DB + Prometheus).
3. **Alerts & export** — Error-rate spike, fallback rate, latency P95, and cost alerts; CSV/JSON export endpoints (with filters, pagination, streaming, and optional background job + S3 for large exports).
4. **Dashboard** — Minimal wiring: Grafana/Metabase suggestions + example dashboard JSON for KPIs (error rate, fallback rate, P95 latency, cost, per-model calls).

**Stack to use:** FastAPI (already in `backend/`), Postgres (Supabase migrations in `supabase/migrations/`), Prometheus, Grafana. Existing inference entrypoints: `backend/app/api/infer.py` (infer_endpoint), `backend/app/api/analyze.py` (analyze_endpoint). Existing audit: `backend/app/services/audit.py` (`log_inference_audit` → JSONL file). Add **DB-backed** `ai_events` and **Prometheus** metrics without removing current file audit.

---

## 2. Telemetry schema — `ai_events` table

**Migration file:** `supabase/migrations/20250220000000_create_ai_events.sql` (or next timestamp in your sequence).

- Create table `ai_events` with columns:
  - `id` (UUID, PK), `org_id`, `client_id`, `user_id`, `request_id`, `trace_id`
  - `endpoint` (e.g. `analyze`, `infer`), `model_name`, `model_version`, `adapter_id`
  - `input_size_bytes`, `output_size_bytes`, `latency_ms`, `compute_ms`, `cost_usd`
  - `success`, `error_code`, `error_message` (no PHI — truncate/redact)
  - `fallback_used`, `fallback_reason`, `fallback_model`
  - `provenance` (JSONB), `tags` (JSONB), `consent` (boolean), `created_at` (TIMESTAMPTZ)
- Indexes: `(org_id, created_at)`, `(request_id)`, `(model_name, created_at)`, optionally `(user_id)`.
- **Semantics:** `request_id` = per-request ID (already in `get_request_id(request)`); `trace_id` = W3C trace context if present; `cost_usd` from configurable cost model; no PHI in `error_message` or `provenance`.

---

## 3. Instrumentation — wire analyze/infer to emit telemetry

- **New module:** `backend/app/telemetry/` (or `backend/telemetry/` if you prefer repo-root).
  - **Emitter:** Helper that builds an event envelope (dict) from inference context and writes to:
    1. **Postgres** — `INSERT INTO ai_events (...)` (use connection pool; best-effort, do not fail inference on DB write failure).
    2. **Prometheus** — counters/histogram with **bounded labels only:** `org_id`, `model_name`, `fallback_model`, `error_code` (controlled). Do **not** use `user_id`, `request_id`, `trace_id` as Prometheus labels.
  - **Metrics to expose:**  
    - `ai_inference_requests_total{org_id, model_name}`  
    - `ai_inference_errors_total{org_id, model_name, error_code}`  
    - `ai_inference_fallbacks_total{org_id, fallback_model}`  
    - `ai_inference_latency_seconds` (histogram, same labels)  
    - `ai_cost_usd_total{org_id}` (Gauge or Counter)
  - **Wrapper/decorator:** Optional decorator or explicit call around the actual inference call that: starts timer, gets `request_id` from request, on success/exception/fallback builds envelope and calls emitter (DB + Prometheus). Truncate `error_message` (e.g. 1000 chars) and scrub PHI.
- **Wire locations:**
  - `backend/app/api/infer.py`: after `svc.infer_with_precomputed_embedding` (and in mock/fallback and exception paths), call emitter with envelope (request_id, model_name, org_id from request or default, latency_ms, success, fallback_used, cost_usd, etc.).
  - `backend/app/api/analyze.py`: same idea around `medgemma_svc.analyze_input` / `run_analysis` and exception/fallback paths.
- **DB connection:** Use existing Postgres config if present (e.g. Cloud SQL / Supabase); add a small pool or async driver (e.g. asyncpg or SQLAlchemy async) for writes. If DB is unavailable, log and continue (no 500 from telemetry).

---

## 4. API contracts — telemetry & export

Add FastAPI router under `/api/telemetry` (e.g. `backend/app/api/telemetry.py`):

- **GET /api/telemetry/events**  
  Query params: `org_id`, `model_name`, `date_from`, `date_to`, `success`, `fallback_used`, `limit` (default 100), `offset` (default 0).  
  Response: `{ "total": N, "items": [ AiEvent ] }`. Enforce RBAC (e.g. user can only see own org).

- **GET /api/telemetry/events/stream**  
  Stream CSV for small exports (e.g. limit 1000), `Content-Type: text/csv`. Same filters as above.

- **POST /api/telemetry/export**  
  Body: `{ "filters": { ... }, "format": "csv" | "json" }`. Create export job in DB (`exports` table), return `{ "job_id": "...", "status": "pending" }`. Background task or worker processes job, writes file (e.g. gzipped CSV), uploads to S3 (or local storage), updates job with `result_url` and status. RBAC: only org_admin or allowed role.

- **GET /api/telemetry/export/{job_id}**  
  Return job status and download URL (signed, short-lived). RBAC: only requester’s org.

- **GET /api/telemetry/alerts**  
  List active alerts (from Alertmanager API or from DB if you store alerts). Response: list of alerts with id, severity, summary, description.

- **POST /api/telemetry/alerts/{alert_id}/ack**  
  Acknowledge alert (store in `alert_acknowledgements` if applicable).

OpenAPI: Add these paths and a schema for `AiEvent` (all fields of `ai_events` as JSON). Document query params and response shapes.

---

## 5. Exports table and background job

- **Migration:** `supabase/migrations/20250220000001_create_exports_table.sql`  
  Table `exports`: `id` (UUID), `org_id`, `created_by`, `filters` (JSONB), `format`, `status` (pending/running/completed/failed), `result_url`, `file_size`, `created_at`, `completed_at`. Index on `(org_id, created_at)`.

- **Background job:** When `POST /api/telemetry/export` is called, create row with status `pending`, enqueue job (e.g. Celery/Redis or in-process BackgroundTasks). Worker: apply filters, use server-side cursor to stream rows from `ai_events`, write CSV (or JSON) to temp file (optionally gzip), upload to S3 with server-side encryption, set `result_url` (presigned, short TTL) and status `completed`. On error, set status `failed`. RBAC: only org members can create/list/download exports.

---

## 6. Prometheus alerts and recording rules

- **Alert rules file:** e.g. `prometheus/ai_alerts.yml` (or in your existing Prometheus config dir).
  - **AIErrorRateSpike:** `increase(ai_inference_errors_total[15m]) / max(1, increase(ai_inference_requests_total[15m])) > 0.05` for 5m — severity critical.
  - **AIFallbackRateHigh:** fallback rate > 2% over 30m — warning.
  - **AILongLatencyP95:** `histogram_quantile(0.95, ...)` > 5s for 5m — critical.
  - **AIDailyCostThreshold:** `increase(ai_cost_usd_total[24h]) > 100` — warning (tune threshold as needed).

- **Recording rules:** e.g. `prometheus/ai_recording_rules.yml`:  
  - `ai_error_rate_5m`, `ai_fallback_rate_30m`, `ai_p95_latency` (from same expressions as above) for simpler Grafana queries.

- **Metrics endpoint:** Expose `/metrics` (Prometheus scrape). Do not put auth on `/metrics` for in-cluster Prometheus; keep it internal. Use `prometheus_client` in Python (Counter, Histogram, Gauge); ensure labels are bounded.

---

## 7. Dashboard (Grafana)

- **File:** e.g. `grafana/medgemma_ai_phase1_dashboard.json`.
- **Panels:**  
  - KPI row: Total requests (24h), Error rate (5m), Fallback rate (30m), P95 latency, Daily cost (24h).  
  - Time series: requests/errors/fallbacks per minute.  
  - Latency: histogram or percentiles (P50/P90/P95/P99).  
  - Model usage: bar chart by `model_name`.  
  - Table: recent `ai_events` (e.g. from Postgres datasource).  
  - Export jobs table: status and links.
- Use recording rules and metrics names above; Postgres for events/jobs tables.

---

## 8. Security & compliance

- **No PHI in telemetry:** Sanitize `error_message` and `provenance`; do not store raw images. `consent` = true only when explicit consent exists.
- **RBAC:** Only org_admin (or configured role) for export creation and download; scoped by `org_id` on all telemetry APIs.
- **Audit:** Log export downloads and alert acks in `audit_log` (user_id, action, timestamp, IP).
- **S3:** Server-side encryption (e.g. KMS); short-lived presigned URLs for export download.

---

## 9. Retention and archival (optional for Phase 1)

- Plan: partition `ai_events` by month (Postgres native partitioning by `created_at`); retention 180 days; nightly job to archive older partitions to S3 (e.g. Parquet) and detach/delete. Can be Phase 1.1 if time-boxed.

---

## 10. Tests and acceptance criteria

- **Unit:** Emitter builds correct envelope; export job logic (streaming, no PHI in output). Mock DB.
- **Integration:** Run migrations, insert mock events, GET `/api/telemetry/events` with filters and pagination; create export job and assert file/URL (mock S3 with moto if needed).
- **E2E:** One inference run (success), one error, one fallback; assert one row per case in `ai_events` and correct Prometheus counters/histogram.
- **Acceptance:**  
  - `ai_events` table and indices exist.  
  - Analyze/infer paths emit telemetry (success, error, fallback) to DB and Prometheus.  
  - At least 3 alert rules (error spike, fallback rate, P95) added and triggerable in dev.  
  - `POST /api/telemetry/export` creates job; worker produces file and `GET /api/telemetry/export/{job_id}` returns URL.  
  - Grafana dashboard JSON with KPI panels.  
  - CI runs unit + integration tests (e.g. GitHub Actions with Postgres service).

---

## 11. Task checklist (for Lovable / Cursor)

- [ ] **DB:** Add migrations `20250220000000_create_ai_events.sql` and `20250220000001_create_exports_table.sql` (and optional `alert_acknowledgements`).
- [ ] **Telemetry module:** Add `backend/app/telemetry/emitter.py` (and optional `db.py` for pool); implement `emit_event_to_db` and Prometheus metrics; optional decorator `telemetry_wrapper`.
- [ ] **Wire inference:** In `infer.py` and `analyze.py`, after inference (and in except/fallback paths), build envelope and call emitter (DB + Prometheus). Pass `request_id`, `org_id`, `model_name`, `latency_ms`, `success`, `fallback_used`, `cost_usd`, etc.
- [ ] **Metrics endpoint:** Register `GET /metrics` in FastAPI (Prometheus `generate_latest()`), internal only.
- [ ] **Telemetry API:** New router `telemetry.py` with GET events, GET events/stream, POST export, GET export/{job_id}, GET alerts, POST alerts/{id}/ack. Schemas for request/response and OpenAPI.
- [ ] **Export job:** Implement `process_export_job(job_id)`: read filters, server-side cursor on `ai_events`, stream to CSV/JSON, upload to S3 (or local), update `exports` row.
- [ ] **Prometheus:** Add `prometheus/ai_alerts.yml` and `prometheus/ai_recording_rules.yml`; document in README or runbook.
- [ ] **Grafana:** Add `grafana/medgemma_ai_phase1_dashboard.json` with panels above.
- [ ] **Tests:** Pytest for emitter envelope, export streaming, and integration test for events API + export job.
- [ ] **CI:** GitHub Actions job with Postgres service, run migrations and pytest.

Use this document as the single Phase 1 task in Lovable or Cursor; implement in the order above for minimal dependencies. If you want a specific artifact (migration, FastAPI handlers, Prometheus YAML, Grafana JSON) as a ready-to-commit file, request it by name.

---

## Implemented artifacts (ready-to-commit)

The following were added in-repo and can be committed as-is:

| Artifact | Path |
|----------|------|
| Prompt (this doc) | `docs/LOVABLE_PROMPT_PHASE1_TELEMETRY_ALERTS_EXPORT.md` |
| Migration: ai_events | `supabase/migrations/20250220000000_create_ai_events.sql` |
| Migration: exports | `supabase/migrations/20250220000001_create_exports_table.sql` |
| Migration: alert_ack | `supabase/migrations/20250220000002_create_alert_acknowledgements.sql` |
| Telemetry emitter | `backend/app/telemetry/emitter.py` (+ `__init__.py`) |
| Wire infer + analyze | `backend/app/api/infer.py`, `backend/app/api/analyze.py` |
| Prometheus /metrics | `backend/app/api/health.py` |
| Alert rules | `prometheus/ai_alerts.yml` |
| Recording rules | `prometheus/ai_recording_rules.yml` |
| Telemetry API | `backend/app/api/telemetry.py` (events, stream, export, alerts) |
| Grafana dashboard | `grafana/medgemma_ai_phase1_dashboard.json` |
| Backend dep | `backend/requirements.txt` (prometheus_client) |
| Main router | `backend/app/main.py` (telemetry router + epic_fhir import) |
