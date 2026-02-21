# Changelog: MedGemma pipeline improvements

## Summary (Pages 2–7)

- **Page 2 – Requirements**
  - `requirements-training.txt`: GPU training (torch, transformers, peft, accelerate, etc.).
  - `requirements-inference.txt`: CPU-friendly inference (onnxruntime, faiss-cpu).
  - `dev-requirements.txt`: pytest, flake8, black, isort, mypy, pre-commit.

- **Page 3 – Data**
  - `data/schema.py`: Pydantic `CaseRecord` and `VALID_LABELS`.
  - `data/loader.py`: JSONL/CSV loaders with schema validation; `sanity_check()`.
  - `data/synth.py`: Reproducible synthetic JSONL (`python -m data.synth --n 200 --out data/synth_train.jsonl`).
  - `tests/test_data_loader.py`: Tests for loaders and synth.

- **Page 4 – Preprocessing / embeddings**
  - `preprocess/image.py`: Load/resize/center-crop for encoder.
  - `preprocess/embed.py`: MedSigLIP-style pipeline; L2-normalize; `--synthetic` fallback.
  - `notebooks/embedding_examples.ipynb`: Synthetic embeddings + FAISS nearest-neighbor demo.

- **Page 5 – Training**
  - `training/utils.py`: `JsonlTextDataset`, `collate_causal_lm`, `load_jsonl_for_training`.
  - `training/finetune_lora.py`: `--train_file` JSONL, `--model_name_or_path`, `--output_dir`, `--adapter-dir`, `--max_steps`, etc. Saves adapter to `adapters/pediscreen_v1` (or given path).
  - `tests/test_training_small.py`: JsonlTextDataset, collate, optional one-step GPU smoke.

- **Page 6 – Prompts**
  - `prompts/templates.md`: Clinical summary and zero/few-shot templates.
  - `prompts/render.py`: `python -m prompts.render --prompt_id X` with metadata and `prompt_hash`.
  - `prompts/eval_prompts.jsonl`: Sample eval prompts.

- **Page 7 – Eval**
  - `eval/metrics.py`: Sensitivity, specificity, PPV, NPV, accuracy, F1, confusion matrix.
  - `eval/evaluate.py`: `--eval_file`, `--report_path`, `--mock`; writes `eval/report.json` with metrics and artifacts.
  - `tests/test_eval_small.py`: Metrics and report structure.

## Verification commands (Page 18 style)

```bash
# From repo root
pip install -r requirements-inference.txt
python -m data.synth --n 200 --out data/synth_train.jsonl
python preprocess/embed.py --input data/synth_train.jsonl --out data/embeddings.npy --synthetic
python training/finetune_lora.py --train_file data/synth_train.jsonl --output_dir adapters/test --num_train_epochs 1 --max_steps 1  # GPU
python -m eval.evaluate --eval_file data/synth_train.jsonl --report_path eval/report.json --mock
pytest tests/test_data_loader.py tests/test_training_small.py tests/test_eval_small.py -v
```

## PR title examples

- `deps: add requirements-training.txt, requirements-inference.txt, dev-requirements.txt`
- `data: add schema, loader, synthetic generator and tests`
- `preprocess: add image and embedding pipeline with synthetic fallback`
- `training: add JSONL support and LoRA CLI (Page 5)`
- `prompts: add templates and render script`
- `eval: add metrics and evaluate script with report.json`
