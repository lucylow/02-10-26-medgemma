# PR: Improve Model Integration — Production-Ready Backend

## Summary

- Adds production-grade embed & inference servers (dummy-mode for CI)
- Adds PEFT/LoRA adapter loading demo and scripts
- Adds tests, CI, Docker, docker-compose, and runbook
- Adds monitoring & explainability skeleton (FAISS)
- Adds governance (model card, adapter registry)

## How to Run Locally

1. `python -m venv .venv`
2. `source .venv/bin/activate` (Windows: `.venv\Scripts\activate`)
3. `pip install -r requirements.txt -r requirements-dev.txt`
4. `export EMBED_MODE=dummy`
5. `export DUMMY_MEDGEMMA=1`
6. `uvicorn backend.api:app --reload --port 8000`
7. `./scripts/run_demo.sh` (or `./scripts/run_demo.sh --ci` for dummy mode)

## CI

- Runs lint & pytest with dummy-mode
- Builds Docker image and smoke test

## Pending Work

- Integrate real MedSigLIP/MedGemma model weights (requires credentials & compute)
- Add full integration tests with real models on a GPU runner

## Files Added/Modified

- `DEVNOTES/REPO_INVENTORY.md`, `DEVNOTES/ISSUES_DISCOVERED.md`
- `backend/schemas.py`, `backend/embed_server.py`, `backend/medgemma_service.py`, `backend/api.py`, `backend/audit.py`, `backend/explainability.py`
- `docs/contracts.md`, `docs/performance.md`
- `tests/test_api_infer.py`, `tests/test_audit_log.py`, `tests/test_explainability.py`, `tests/test_monitoring_metrics.py`
- `scripts/run_demo.sh`, `scripts/run_inference.sh`, `scripts/smoke_ci.sh`
- `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`
- `model_card/medgemma_model_card.md`, `adapters/registry.json`
- `RUNBOOK.md`, `monitoring/README.md`, `LEGAL/README.md`
