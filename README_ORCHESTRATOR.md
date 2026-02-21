# Orchestrator & Worker (PediScreen AI)

This document describes the **RQ-based** orchestrator: it accepts screening inference jobs via HTTP, queues them with **RQ (Redis Queue)**, and a worker routes requests to model servers (edge/cloud) and writes results and audit records to the DB.

## Two orchestrator styles in this repo

1. **Routing orchestrator** (`orchestrator/app/main.py` at root paths)
   - **POST /route_task** — Task-based routing with idempotency, consent, Redis Streams queues.
   - **GET /task/{task_id}**, **POST /register_agent**, **GET /metrics**.
   - See `orchestrator/README.md` for routing policy and Redis Streams workers.

2. **RQ orchestrator** (this section)
   - **POST /api/submit** — Submit a screening job (case_id, age_months, observations, embedding_b64, preferred_target).
   - **GET /api/status/{job_id}** — Job status and result.
   - **GET /api/jobs** — List recent jobs.
   - Uses **RQ** queue `pedi-screen` and **modelreasoner/worker.py** (`process_job`).

## Requirements

- Python 3.9+
- Redis (for RQ). Tests mock the queue and model server.
- Optional: Postgres for production (set `DATABASE_URL`); default is SQLite.

## Quick dev run (SQLite, no worker)

1. Install deps:
   ```bash
   pip install -r requirements-orchestrator.txt
   ```

2. Start the API (from repo root):
   ```bash
   uvicorn orchestrator.app.main:app --reload --port 9000
   ```

3. Submit a job:
   ```bash
   curl -X POST http://localhost:9000/api/submit \
     -H "Content-Type: application/json" \
     -d '{"age_months": 24, "observations": "limited vocabulary", "preferred_target": "auto"}'
   ```
   Without a running RQ worker, the job stays in the queue (status can be polled via **GET /api/status/{job_id}**).

## Run with RQ worker (local)

1. Start Redis:
   ```bash
   docker run -p 6379:6379 redis:7
   ```

2. Start the API (as above).

3. Set model endpoints and start the RQ worker:
   ```bash
   export CLOUD_MODEL_URL=http://localhost:8002
   export REDIS_URL=redis://localhost:6379/0
   rq worker pedi-screen
   ```
   (Run from repo root so `orchestrator` and `modelreasoner` are importable, or set `PYTHONPATH=.`.)

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./orchestrator_dev.db` | DB for jobs, cases, audits |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis for RQ |
| `EDGE_MODEL_URL` | — | Model server URL for edge (optional) |
| `CLOUD_MODEL_URL` | — | Model server URL for cloud (at least one required for worker) |
| `ROUTING_TIMEOUT_SECONDS` | 10 | Timeout for model server HTTP call |
| `LOG_LEVEL` | INFO | Logging level |

## Database migrations

- **Dev:** Tables are created automatically on startup via `orchestrator.models.init_db()`.
- **Production (Postgres):** Run the SQL migration:
  ```bash
  psql $DATABASE_URL -f migrations/001_create_tables.sql
  ```

## Tests

```bash
pytest tests/test_orchestrator_rq.py -v
```

Tests patch RQ enqueue to run `process_job` synchronously and mock the model server HTTP call so no Redis or external service is required.

## Docker Compose (full stack)

From repo root:

```bash
docker-compose -f docker-compose.orchestrator.yml up --build
```

Runs Postgres, Redis, orchestrator (port 9000), RQ worker, and OpenTelemetry collector. Use `Dockerfile.orchestrator` and `Dockerfile.worker`; see `requirements-compose.txt` for deps.

## Kubernetes / Helm

```bash
helm install pedi-orch charts/pedi-orchestrator -n pediscreen \
  --set databaseUrl="postgresql://..." --set redisUrl="redis://..." --set apiKey="..."
```

Chart: `charts/pedi-orchestrator/` (orchestrator + worker deployments, service, secret, Prometheus scrape annotations). Use ExternalSecrets or `--set-file` for production secrets.

## Observability

- **Prometheus rules:** `prometheus/rules/pedi-orchestrator-alerts.yaml` (queue length, latency, failures, worker count, DB errors).
- **Grafana:** Import `grafana/dashboards/pedi-orchestrator-dashboard.json` (queue, latency p95, failed jobs, throughput, worker count, DB errors).
- **OpenTelemetry:** Set `OTEL_COLLECTOR_URL` (e.g. `http://otel-collector:4318/v1/traces`); collector config: `observability/otel-collector-config.yml`.
- **Structured logging:** Optional `python-json-logger`; JSON logs when available.

## Auth

- **API key:** Set `API_KEY`; then send `x-api-key` header on `/api/submit`, `/api/status/{job_id}`, `/api/jobs`. See `orchestrator/app/auth.py`. If `API_KEY` is unset (dev), no auth is required.
- **mTLS:** Use ingress or sidecar (e.g. nginx with `ssl_verify_client on`) for internal service-to-service.

## Alembic (migrations)

```bash
pip install alembic
export DATABASE_URL=postgresql://...
alembic upgrade head
```

Postgres-only (ENUM types). Initial migration: `alembic/versions/0001_create_tables.py`.

## Files

- `orchestrator/models.py` — Job, Case, Audit, JobStatus, init_db
- `orchestrator/queue_rq.py` — RQ queue, enqueue_job, get_rq_job_status/result
- `orchestrator/api_router.py` — /api/submit, /api/status/{job_id}, /api/jobs (+ optional API key)
- `orchestrator/app/main.py` — FastAPI app; OTEL + JSON logging on startup; includes api_router and init_db
- `orchestrator/app/auth.py` — require_api_key dependency
- `modelreasoner/worker.py` — process_job (RQ worker), edge/cloud routing, Prometheus metrics (when METRICS_PORT set), DB update and audit
- `migrations/001_create_tables.sql` — Postgres schema for cases, jobs, audits
- `docker-compose.orchestrator.yml`, `Dockerfile.orchestrator`, `Dockerfile.worker`, `Dockerfile.modelserver` (GPU-ready model server), `observability/otel-collector-config.yml`
- `charts/pedi-orchestrator/` — Helm chart; use `values.prod.yaml` for GKE/EKS (IRSA/Workload Identity placeholders, HPA, optional ServiceMonitor)
- `charts/pedi-orchestrator/templates/servicemonitor.yaml` — Prometheus Operator ServiceMonitor when `prometheus.serviceMonitor.enabled: true`
- `deploy/nginx-mtls/` — NGINX mTLS sidecar config and K8s example
- `prometheus/rules/pedi-orchestrator-alerts.yaml`, `grafana/dashboards/pedi-orchestrator-dashboard.json`
- `alembic.ini`, `alembic/env.py`, `alembic/versions/0001_create_tables.py`
