# Replit — Run Instructions & Env Vars

Run instructions and environment checklist for the PediScreen/MedGemma stack on Replit (Feb 14 environment).

## Required secrets / env vars (Replit)

Set these in Replit Secrets or `.env` as needed:

| Variable | Description |
|----------|-------------|
| `MEDGEMMA_MODEL` | Base model id (e.g. `google/medgemma-2b-it`). |
| `ADAPTER_PATH` | Optional LoRA adapter path (local, gs://, or URL). |
| `MOCK_FALLBACK` | `true` (default) to return mock when model unavailable; `false` to return 503. |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| `AUDIT_LOG_PATH` | Path for inference audit JSONL (default `data/audit.log`). |

For backend API (HF/Vertex):

- `HF_MODEL`, `HF_API_KEY` — Hugging Face inference.
- `VERTEX_PROJECT`, `VERTEX_LOCATION`, etc. — Vertex AI.
- `API_KEY` — Backend API key for clients.

## Ephemeral filesystem on Replit

Replit’s filesystem can be ephemeral. For audit and persistent state:

- Prefer **Replit Database** or **external storage** (e.g. GCS, S3) for `audit.log` and any persistent data.
- Set `AUDIT_LOG_PATH` to a path you back up or to a Replit DB–backed path if you implement it.
- Do **not** rely on local disk for long-term audit retention unless you ship logs elsewhere.

## Run commands

```bash
# Install dependencies
pip install -r requirements.txt
# If using backend from repo root:
pip install -r backend/requirements.txt

# Run embed server (MedSigLIP)
uvicorn server.embed_server:app --host 0.0.0.0 --port 5000

# Or run backend API (FastAPI)
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
# From repo root:
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

## Debugging

```bash
export LOG_LEVEL=DEBUG
# Then run the server as above
```

- Inspect `data/audit.log` (or `AUDIT_LOG_PATH`) for inference audit events.
- Check response header `X-Request-Id` for log correlation.
- On model load failure, server starts in degraded mode and returns mock when `MOCK_FALLBACK=true`.

## Simulate model missing

```bash
export MEDGEMMA_MODEL=invalid/model/name
# or for backend: ensure HF_MODEL / Vertex are unset
python -m server.embed_server  # or run backend
# Call /embed or /api/infer and confirm mock responses or 503 as configured.
```

These instructions are intended to be copy-paste friendly and sufficient for prototype/demo and clinical pilot use on Replit.
