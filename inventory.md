# PediScreen AI — ML Artifacts & Code Inventory

> Generated per runbook Page 2. Last updated: 2026-02-14

## Training Scripts

| Path | Description |
|------|-------------|
| `model/finetuning/finetune_pediscreen.py` | MedGemma LoRA fine-tuning (placeholder dataset) |
| `training/finetune_lora.py` | LoRA training using config.settings, expects `my_finetune_dataset` on disk |

## Server & Inference Code

| Path | Description |
|------|-------------|
| `backend/api.py` | Unified FastAPI: `/health`, `/embed`, `/infer` |
| `backend/embed_server.py` | MedSigLIP embedding logic (real/dummy/hybrid modes) |
| `backend/medgemma_service.py` | MedGemma + PEFT adapter inference, circuit breaker |
| `backend/schemas.py` | Pydantic schemas for embedding/inference API |
| `backend/audit.py` | Inference audit logging |
| `backend/explainability.py` | FAISS EmbeddingIndex for nearest-neighbor retrieval |

## Adapters

| Path | Description |
|------|-------------|
| `adapters/registry.json` | Adapter registry (pediscreen_v1, base google/medgemma-2b-it) |
| `adapters/pediscreen_lora` | Local adapter path (referenced in .env.example) |

## Datasets

| Path | Description |
|------|-------------|
| `data/` | **Not present** — runbook Page 4 expects `data/raw/`, `data/manifests/` |
| `data/processing/` | Referenced in README (synthetic data generation) |
| `data/validation_set/` | Referenced in README (sample evaluation data) |

## Evaluation

| Path | Description |
|------|-------------|
| `model/evaluation/` | **Not present** — runbook expects eval scripts |
| `eval/` | **Not present** — runbook expects `eval/evaluate_model.py`, `eval/embedding_checks.py` |

## Configuration

| Path | Description |
|------|-------------|
| `.env.example` | EMBED_MODE, MEDSIGLIP_MODEL, MEDGEMMA_BASE, ADAPTER_PATH |
| `config/settings.py` | Used by training/finetune_lora.py |
| `config/train.yaml` | **Not present** — runbook Page 7 |
| `config/eval.yaml` | **Not present** — runbook Page 6 |

## Model Card & Docs

| Path | Description |
|------|-------------|
| `model/README.md` | Hugging Face trace / model card |
| `model_card/medgemma_model_card.md` | MedGemma model card |

## Scripts

| Path | Description |
|------|-------------|
| `scripts/run_demo.sh` | End-to-end demo (embed + infer) |
| `scripts/run_inference.sh` | Inference via API |
| `scripts/load_and_infer.py` | Adapter load + inference demo |
| `scripts/sample_embedding.py` | Sample embedding generation |
| `scripts/smoke_ci.sh` | CI smoke test |
| `scripts/upload_adapters.py` | Upload adapters (HF) |

## Tests

| Path | Description |
|------|-------------|
| `tests/test_embed_server.py` | Embed endpoint tests |
| `tests/test_medgemma_real_and_fallback.py` | MedGemma fallback behavior |
| `tests/test_circuitbreaker_behaviour.py` | Circuit breaker |
| `tests/test_api_infer.py` | API /health, /embed, /infer |
| `tests/test_explainability.py` | EmbeddingIndex |
| `tests/test_audit_log.py` | Audit logging |
| `tests/test_adapter_load.py` | Adapter load smoke |

## Monitoring

| Path | Description |
|------|-------------|
| `monitoring/export_metrics.py` | record_inference, record_embedding_norm |
| `monitoring/README.md` | Drift metrics (embedding_norm, etc.) |

## Gaps vs Runbook

- **Page 3**: No `pinned-requirements.txt`, no `Dockerfile.dev`
- **Page 4**: No `data/`, `schemas/case_schema.json`, `data/build_manifest.py`
- **Page 5**: No `data/augment/` scripts
- **Page 6**: No `eval/embedding_checks.py`, `config/eval.yaml`
- **Page 7**: No `training/train_adapter.py` with config-driven recipe
- **Page 8**: No `experiments/` ablation infrastructure
- **Page 9**: No `eval/evaluate_model.py`
- **Page 11**: `backend/explainability.py` exists; no standalone `explain/neighbors.py` or `indexes/`
- **Page 12**: No `calibration/` scripts
- **Page 13**: No `distill/` scripts
- **Page 14**: No `MODEL_CARD.md` in repo root; `scripts/upload_adapter.py` referenced
- **Page 15**: CI exists; no `ci/model-smoke.yml` or `ops/monitoring/`
- **Page 17**: No `.github/PULL_REQUEST_TEMPLATE.md`
