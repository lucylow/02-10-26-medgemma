# Hospital-Grade AI Observability (Phases 2–5)

This document describes the production-grade modules added for drift, federated learning, bias/fairness, and IRB-ready audit export.

## Overview

| Phase | Focus | Key artifacts |
|-------|--------|----------------|
| **2** | Drift + PSI | `migrations/003_drift_monitoring.sql`, `backend/app/telemetry/psi.py`, `workers/drift_worker.py`, `backend/app/telemetry/drift_metrics_exporter.py` |
| **3** | Federated metrics | `migrations/004_federated_metrics.sql`, `federated/strategy.py`, `federated/database.py`, `backend/app/telemetry/federated_metrics.py` |
| **4** | Bias & fairness | `migrations/005_bias_metrics.sql`, `backend/app/telemetry/fairness.py`, Telemetry UI tab + `FairnessBarChart` |
| **5** | IRB audit export | `migrations/006_audit_log.sql`, `backend/app/telemetry/audit_export.py`, `GET /api/telemetry/irb-export` |

## Database migrations

Run against your **observability/Cloud SQL Postgres** (same DB as `ai_events`):

```bash
# Ensure uuid-ossp is available (003 creates it if not exists)
psql $DATABASE_URL -f migrations/003_drift_monitoring.sql
psql $DATABASE_URL -f migrations/004_federated_metrics.sql
psql $DATABASE_URL -f migrations/005_bias_metrics.sql
psql $DATABASE_URL -f migrations/006_audit_log.sql
```

Or run all in order with your migration runner.

## Phase 2 — Drift + PSI

- **Tables**: `embedding_baseline_stats`, `embedding_current_stats`, `drift_metrics`
- **PSI**: `backend/app/telemetry/psi.py` — `calculate_psi(expected, observed)`, `classify_drift(psi)` → `none` / `moderate` / `high`
- **Worker**: `workers/drift_worker.py` — `compute_drift_for_model(model_name)`; use `run_drift_for_all_models()` on a schedule (cron or Celery). Set `DATABASE_URL` or rely on Cloud SQL when enabled.
- **Prometheus**: `drift_metrics_exporter.export_drift_metrics()` — sets `ai_embedding_psi` gauge. Call from `/metrics` or a periodic job.

## Phase 3 — Federated learning

- **Table**: `federated_round_metrics` (round_number, global_loss, global_accuracy, participating_clients, dp_noise_multiplier, secure_aggregation)
- **Strategy**: Use `federated.strategy.TelemetryFedAvg` in place of `flwr.server.strategy.FedAvg`; it persists each round via `federated.database.save_round_metrics`.
- **Prometheus**: `backend/app/telemetry/federated_metrics.py` — `federated_global_loss`, `federated_global_accuracy` (label: round). Call `set_federated_metrics(round, loss, accuracy)` or `export_federated_metrics_from_db()`.

## Phase 4 — Bias & fairness

- **Table**: `fairness_metrics` (model_name, protected_attribute, group_value, false_positive_rate, false_negative_rate, demographic_parity, equalized_odds)
- **Logic**: `backend/app/telemetry/fairness.py` — `demographic_parity()`, `equalized_odds()`, `compute_fairness_row()` for batch insert
- **API**: `GET /api/telemetry/fairness` — returns items for dashboard
- **UI**: Telemetry page → **Bias & Fairness** tab with `FairnessBarChart` (FPR / FNR by group)

## Phase 5 — IRB-ready audit export

- **Table**: `audit_log` (event_type, user_id, model_name, input_hash, output_hash)
- **Hashing**: `backend/app/telemetry/audit_export.py` — `hash_payload(payload)` (SHA-256 of JSON, sort_keys)
- **Report**: `generate_irb_export(output_path=..., include_drift=..., include_fairness=..., include_audit_tail=...)` — writes JSON with drift_summary, fairness_summary, audit_tail, report_hash
- **API**: `GET /api/telemetry/irb-export` — returns the report JSON (use x-api-key)

Optional: from your inference path, log to `audit_log` with `event_type='inference'`, `input_hash=hash_payload(input_dict)`, `output_hash=hash_payload(output_dict)` for full traceability.

## Resulting architecture

- PSI drift detection with DB storage and Prometheus export  
- Federated learning round telemetry with DP and secure aggregation flags  
- Bias & fairness monitoring (FPR/FNR, demographic parity, equalized odds) and dashboard  
- IRB-ready cryptographic audit export and report hashing  
- Hospital-grade traceability and regulatory readiness  

Next steps (as you choose): HIPAA PHI isolation, FHIR drift tagging, full Grafana dashboards, MedSigLIP embedding training stub, FDA SaMD scaffolding.
