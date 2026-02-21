# AU — Audit and Accountability (NIST 800-53 Rev.5)

## AU-2 Event Logging

- **Implementation:** Request ID middleware; AI telemetry (model, latency, errors); audit tables for high-risk actions; Epic FHIR actions logged with correlation ID and duration (no PHI).
- **Artifacts:** `backend/app/core/request_id_middleware.py`, `backend/app/api/telemetry.py`, `backend/app/services/audit.py`, `backend/app/core/hospital_logging.py`.

## AU-3 Content of Audit Records

- **Implementation:** Audit records include actor, action, resource, timestamp, outcome. PHI excluded from audit payloads; hashed or indirect references where needed.
- **Artifacts:** Audit schema and logging format in `backend/app/services/audit.py`; structured logging.

## AU-6 Audit Review

- **Implementation:** Grafana dashboards (e.g. `grafana/pediscreen_ai_dashboard.json`); Prometheus metrics; Sentry for errors; drift and bias dashboards (DriftDashboard, BiasDashboard) for model behavior review.
- **Artifacts:** `observability/`, `grafana/`, Prometheus/ServiceMonitor in charts, Sentry integration.

## AU-9 Protection of Audit Information

- **Implementation:** Audit logs stored with restricted access; database and log backends configured for integrity and access control.
- **Artifacts:** DB permissions; log aggregation access controls; K8s secrets for credentials.
