# Routing Orchestrator

Resilient, auditable routing layer that dispatches work to AI agents (embedder, modelreasoner, audit, etc.) with priority queues, idempotency, and sync/async paths.

## Features

- **POST /route_task** — Accept tasks (embed, analyze_monitor, analyze_refer, etc.), validate consent, route by capability and locality, return `task_id` (202) or sync result (200).
- **GET /task/{task_id}** — Task status (extend with result store).
- **POST /register_agent** — Agents register capabilities and endpoint for discovery.
- **Idempotency** — Same `idempotency_key` returns existing `task_id` (no duplicate heavy jobs).
- **Audit** — Every routing decision persisted to `audit_entries` (Postgres or SQLite).
- **Queue** — Redis Streams (`tasks:urgent`, `tasks:high`, `tasks:normal`, `tasks:low`) for async work.
- **Metrics** — Prometheus: `orchestrator_tasks_total`, `orchestrator_tasks_queued_total`, `orchestrator_queue_size`, etc., on `/metrics`.

## Routing policy

- **Privacy-first:** If `consent.consent_given` is false, raw-image–capable agents are excluded.
- **Capability-based:** Task type maps to required capabilities (e.g. `embed`, `analyze_light`, `analyze_heavy`).
- **Locality:** Edge agents (location starting with `edge`) are preferred when healthy.
- **Sync path:** For `analyze_monitor`, the router attempts a short timeout call to a candidate; on success returns result immediately.
- **Async path:** Otherwise the task is enqueued to the priority stream and `task_id` returned.

## Quick start (local)

1. **Redis and DB**

   ```bash
   # Use docker-compose or run Redis + Postgres locally
   export REDIS_URL=redis://localhost:6379/0
   export DATABASE_URL=sqlite:///./orchestrator_audit.db   # or postgresql://...
   ```

2. **Create tables**

   ```bash
   python orchestrator/scripts/create_tables.py
   ```

3. **Start orchestrator**

   ```bash
   uvicorn orchestrator.app.main:app --reload --port 8080
   ```

4. **Register a mock agent (optional)**

   ```bash
   curl -X POST http://localhost:8080/register_agent \
     -H "Content-Type: application/json" \
     -d '{"agent_id":"embedder-1","capabilities":"embed","endpoint":"http://localhost:8001","location":"edge-clinic-1"}'
   ```

5. **Submit a task**

   ```bash
   curl -X POST http://localhost:8080/route_task \
     -H "Content-Type: application/json" \
     -d '{"case_id":"c1","task_type":"embed","payload":{"image_ref":"s3://bucket/img.jpg"},"priority":"normal","idempotency_key":"k1","consent":{"consent_given":true}}'
   ```

6. **Run workers** (consume from Redis)

   ```bash
   python -m orchestrator.workers.embedder_worker    # or python embedder/worker.py
   python -m orchestrator.workers.modelreasoner_worker
   ```

## Smoke test

From repo root:

```bash
./scripts/smoke_test.sh
```

Or manually: start Redis, create DB tables, start app, POST a task, assert 202 and `task_id`, then run a worker and confirm task is consumed.

## Config

| Env | Default | Description |
|-----|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379/0` | Redis for streams and optional agent registry |
| `DATABASE_URL` | `sqlite:///./orchestrator_audit.db` | Postgres or SQLite for audit and idempotency |
| `ORCHESTRATOR_AGENT_TTL` | 120 | Seconds after which an agent is considered stale |
| `ORCHESTRATOR_SYNC_TIMEOUT` | 0.8 | Timeout for sync path (seconds) |
| `ORCHESTRATOR_STREAM_MAXLEN` | 10000 | Max length of each Redis stream |
| `ORCHESTRATOR_TASK_MAX_RETRIES` | 3 | Worker retries before DLQ |

## Tests

```bash
pytest tests/test_router_policy.py tests/test_idempotency.py tests/test_routing_integration.py -v
```

## Schema

- **Task:** `orchestrator/schemas/task_schema.json`
- **Agent:** `orchestrator/schemas/agent_schema.json`

## Security

- Use **ExternalSecrets** or Vault for DB and Redis credentials in production.
- Protect `/route_task` and `/register_agent` with JWT or mTLS.
- Do not log raw images or unredacted PHI; only `case_id` and `consent_id` in audit.

## Helm

The chart `deploy/charts/pediagents` deploys the orchestrator; ensure Redis and Postgres are available (or use the chart’s optional Redis/Postgres for small clusters). ConfigMap can set queue stream names and retry config.
