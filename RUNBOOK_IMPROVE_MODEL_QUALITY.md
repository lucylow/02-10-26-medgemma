# Runbook: Improve Model Quality — Implementation Map

This document maps the **Cursor runbook pages** to files created or to be created in this repo.

## ✅ Implemented (this session)

| Page | Deliverable | Location |
|------|-------------|----------|
| 2 | Inventory | `inventory.md` |
| 3 | Config, requirements | `config/train.yaml`, `config/eval.yaml`, `requirements-train.txt` |
| 6 | Embedding checks | `eval/embedding_checks.py` |
| 7 | Reproducible training | `training/train_adapter.py`, `config/train.yaml` |
| 9 | Evaluation harness | `eval/evaluate_model.py` |
| 17 | PR template | `.github/PULL_REQUEST_TEMPLATE.md` |

## Quick start

```bash
# Create branch
git checkout -b improve-model-quality/<initials>-<YYYYMMDD>

# Install training deps
pip install -r requirements.txt -r requirements-train.txt

# Run embedding checks (no model needed)
python eval/embedding_checks.py --out eval/embedding_checks.json

# Run evaluation (mock mode, no adapter needed)
python eval/evaluate_model.py --manifest data/manifests/test.jsonl --out eval/results_smoke.json

# Train adapter (requires data/manifests/train.jsonl or uses placeholder)
accelerate launch training/train_adapter.py --config config/train.yaml
```

## Remaining pages (to implement)

| Page | Task | Notes |
|------|------|------|
| 4 | Data schema, build_manifest.py | `data/README.md`, `schemas/case_schema.json`, `data/build_manifest.py` |
| 5 | Augmentation | `data/augment/image_augment.py`, `data/augment/text_augment.py` |
| 8 | Hyperparameter tuning | Optuna sweep, `experiments/ablation_summary.md` |
| 10 | Human eval | `human_eval/template_cases.csv`, web UI, `human_eval/collect_and_aggregate.py` |
| 11 | FAISS explain | `explain/neighbors.py`, `indexes/faiss_index.ivf` |
| 12 | Calibration | `calibration/temperature_scaling.py` |
| 13 | Distillation | `distill/distill_encoder.py`, `distill/export_tflite.sh` |
| 14 | HF publish | `scripts/upload_adapter.py`, `MODEL_CARD.md` |
| 15 | CI model smoke | `ci/model-smoke.yml`, `ops/monitoring/` |
| 16 | Tests | `tests/test_infer_fallback.py`, `tests/test_infer_adapter_load.py` |

## Tag for review

When all tests pass and acceptance criteria are met:

```bash
git tag qa/model-quality/v1
```
