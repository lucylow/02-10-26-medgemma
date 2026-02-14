# Runbook: Improve Model Quality

Actionable steps for adding test cases, running evaluation, retraining adapters, and promoting to staging.

## 1. Add Test Cases

1. Add unit tests under `backend/tests/`:
   - `test_embeddings.py` — embedding parse/validation
   - `test_medgemma_service.py` — service behavior, PHI blocking, embedding injection
2. Run: `cd backend && pytest -v`
3. Ensure CI passes: push to trigger `.github/workflows/ci.yml`

## 2. Run Evaluation

1. Prepare eval data: `eval/data/sample_eval.jsonl` (one JSON object per line)
2. Run eval harness (when available): `python eval/run_eval.py`
3. Metrics: sensitivity, specificity, PPV, NPV, AUC
4. Artifacts include `model_version`, `adapter_id`, `prompt_hash`

## 3. Retrain Adapters

1. Use `model/finetuning/` scripts
2. Set seeds: `PYTHONHASHSEED=0`, `torch.manual_seed(42)`
3. Validate on held-out set before promoting

## 4. Promote Adapters to Staging

1. Update `LORA_ADAPTER_PATH` or `MEDGEMMA_ADAPTER_ID` in staging config
2. Run smoke test: `POST /api/infer` with known-good embedding
3. Monitor `/status` and `/health` endpoints

## 5. Embedding Validation

- Use `app.utils.embeddings.parse_embedding_b64(b64, shape)` for all embedding decode paths
- Invalid shape → `ValueError` with clear message (expected vs got bytes)
