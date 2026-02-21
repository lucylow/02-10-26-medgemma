# PediScreen Telemetry Service

FastAPI service for AI telemetry: event ingestion, PostgreSQL storage, optional BigQuery export, and Celery-based daily aggregates (including PSI drift).

## Layout

- `app/main.py` — FastAPI app: `POST /events`, `GET /telemetry?action=overview|models|errors|fallbacks`, `GET /health`
- `app/config.py` — Settings (Postgres, Redis, BigQuery, Sentry)
- `app/db.py` — Async SQLAlchemy engine and session
- `app/models.py` — `TelemetryEvent`, `DailyAggregate`
- `app/crud.py` — Create event, overview, model aggregates, errors, fallbacks
- `app/bigquery_client.py` — Optional upload of events/aggregates to BigQuery
- `app/celery_app.py` — Celery app (Redis broker)
- `app/tasks.py` — `compute_daily_aggregates` (daily rollup + PSI)
- `app/telemetry/psi.py` — Population Stability Index for drift

## Run locally

1. **Environment**

   ```bash
   cd telemetry_service
   python -m venv .venv
   source .venv/bin/activate  # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

2. **Postgres & Redis**

   - Start Postgres and Redis (e.g. `docker compose up -d postgres redis`).
   - Set `DATABASE_URL` and `REDIS_URL` (defaults in `config.py` point to `postgres:5432` and `redis:6379` for Docker).

3. **Run FastAPI**

   ```bash
   export DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/pediscreen
   export REDIS_URL=redis://localhost:6379/0
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Run Celery worker** (optional)

   ```bash
   celery -A app.celery_app:celery_app worker -l info
   ```

5. **Trigger daily aggregates** (optional)

   ```bash
   celery -A app.celery_app:celery_app call app.tasks.compute_daily_aggregates
   ```

## Docker

From `telemetry_service/`:

```bash
docker compose up -d
```

- FastAPI: http://localhost:8000  
- Docs: http://localhost:8000/docs  

## Configuration

- **BigQuery**: Set `ENABLE_BIGQUERY=true`, `BIGQUERY_PROJECT`, `BIGQUERY_DATASET`. Ensure credentials (e.g. `GOOGLE_APPLICATION_CREDENTIALS`) are available.
- **Sentry**: Set `SENTRY_DSN` to enable error tracking.
- **Google Cloud Logging**: Used in production when `ENV=production` and the client is configured.

## Tests

```bash
cd telemetry_service
pip install -r requirements.txt
pytest tests/ -v
```

## OpenAPI

Endpoints align with the PediScreen Telemetry OpenAPI spec: `GET /telemetry` with `action` and `range` query params, and `POST /events` for ingestion.
