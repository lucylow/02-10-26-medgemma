# Repository Inventory — 02-10-26-medgemma

**Date:** 2026-02-14  
**Branch:** ci/improve-model-integration-20260214

## Main Python Packages / Modules

| Path | Purpose |
|------|---------|
| `embed_server/` | Standalone MedSigLIP embedding server (FastAPI); supports USE_DUMMY for CI |
| `backend/` | Main FastAPI backend; `backend/app/` contains core API, services, models |
| `backend/app/` | Nested app: main.py, api/*, services/*, core/*, models/* |
| `backend/app/services/` | MedGemmaService (Vertex/HF), medsiglip_hf, model_wrapper, audit, etc. |
| `pedi-agent-stack/` | Orchestrator, embed_server, medgemma_llm, clinician_ui |
| `model-server/` | Alternative model server |
| `app/backend/` | Another backend variant (orchestrator, agents, medgemma_service) |
| `model/` | Finetuning scripts, evaluation |
| `scripts/` | run_demo.sh, load_and_infer.py, sample_embedding.py, upload_adapters.py |
| `tests/` | test_embed_server.py, test_run_demo_smoke.py, test_adapter_load.py, conftest.py |

## Config Files Present

| File | Purpose |
|------|---------|
| `requirements.txt` | Root deps (fastapi, uvicorn, torch, transformers, peft, etc.) |
| `requirements-dev.txt` | pytest, httpx, black, isort, flake8, mypy, pre-commit |
| `backend/requirements.txt` | Backend-specific (motor, pydicom, google-cloud-aiplatform, redis) |
| `config/settings.py` | Config/settings |
| `backend/app/core/config.py` | Backend settings (APP_NAME, HOST, PORT, HF_*, VERTEX_*) |

## Docker / Docker Compose

| File | Purpose |
|------|---------|
| `Dockerfile` | Root: python:3.10-slim, uvicorn embed_server.app:app, port 5000 |
| `backend/Dockerfile` | Backend-specific |
| `pedi-agent-stack/*/Dockerfile` | Per-service Dockerfiles |
| `model-server/Dockerfile` | Model server |
| `docker-compose.yml` | Not present at root |

## Existing Tests / Fixtures

| Path | Purpose |
|------|---------|
| `tests/test_embed_server.py` | Health + embed endpoint tests |
| `tests/test_run_demo_smoke.py` | Demo smoke test |
| `tests/test_adapter_load.py` | Adapter loading |
| `tests/conftest.py` | USE_DUMMY=1, drawing fixture |
| `tests/fixtures/` | drawing.jpg (created if missing) |
| `backend/tests/` | test_api.py, test_medgemma_service.py, test_report_generation.py |

## Obvious Broken Imports / Missing Files

- Multiple backend structures (`backend/`, `app/backend/`, `pedi-agent-stack/`) may cause confusion.
- `backend/app/main.py` uses `app.main:app` — run from `backend/` directory.
- Root `uvicorn backend.api:app` would require `backend/api.py` (not yet present).
- `scripts/run_demo.sh` expects `tests/fixtures/drawing.jpg`; conftest creates it if missing.
- `faiss` not in requirements; optional for explainability.
- No `.github/workflows/ci.yml` for CI.
