# AI Agents – Docker Compose test setup

Minimal orchestrator + stub modelserver + Redis for local integration tests.

## Quick start

From repo root:

```bash
# Build and start services (Redis, modelserver, orchestrator)
docker compose -f docker-compose.test.yml up --build -d

# Run integration tests (in container)
docker compose -f docker-compose.test.yml run --rm tests
```

Or run pytest on the host (requires `httpx` and `pytest` installed):

```bash
docker compose -f docker-compose.test.yml up --build -d
# wait a few seconds for services to start
pytest -q tests/test_integration.py
# use ORCH_URL=http://localhost:8080 MODEL_URL=http://localhost:8001 if needed
```

## Stop

```bash
docker compose -f docker-compose.test.yml down --volumes --remove-orphans
```

## Layout

- **orchestrator** – FastAPI app with in-memory agent registry; `POST /agents`, `GET /agents`, `POST /route_and_call`.
- **modelserver** – Stub FastAPI app with `/health` and `/call` (echo response).
- **redis** – For future RQ/queue use.
- **tests** – Integration test that registers the modelserver and calls `route_and_call`.

## Next steps

- Replace in-memory registry in `orchestrator/app/crud.py` with DB (e.g. Postgres + SQLAlchemy + Alembic).
- Add RQ worker and enqueue from `/route_and_call`.
- Add observability (OpenTelemetry, Prometheus).
