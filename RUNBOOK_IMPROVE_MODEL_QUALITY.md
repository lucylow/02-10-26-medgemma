# Runbook: Improve Model Quality

Actionable steps for adding test cases, running evaluation, retraining adapters, and promoting to staging.

## 1. Add Test Cases

1. Add unit tests under `backend/tests/`:
   - `test_embeddings.py` — embedding parse/validation
   - `test_medgemma_service.py` — service behavior, PHI blocking, embedding injection
2. Run: `cd backend && pytest -v`
3. Ensure CI passes: push to trigger `.github/workflows/ci.yml`

## 2. Run Evaluation

1. **Generate synthetic eval data** (reproducible):
   ```bash
   python -m pedi_screen.validation.synthetic_eval_generator --n 100 --out data/validation_set
   ```
2. **Run full validation suite**:
   ```python
   from pedi_screen.validation import run_validation_suite, run_full_evaluation
   run_validation_suite()  # benchmark + bias + JSON + safety
   run_full_evaluation()   # + evaluation table for Kaggle
   ```
3. **Metrics**: sensitivity, specificity, PPV, NPV, JSON compliance, safety audit (0 tolerance forbidden language)
4. **Outputs**: `validation_reports/validation_summary.json`, `eval_full_report.json`, `evaluation_table.md`

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
