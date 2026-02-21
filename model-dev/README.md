# Model development (MedGemma-like HAI)

**Purpose:** Reproducible training/finetuning, edge builds, inference APIs for agents, evaluation, and governance for HAI (Human-aligned, medical domain) models.

**Scope:**
- LoRA/PEFT adapter training with provenance and dataset registry
- Distillation & conversion (ONNX → TF → TFLite) for edge
- Embed + reasoner inference servers and agent skill contracts
- Eval pipelines, bias audit, model cards, CI/CD

**Non-goal:** This is CDS (clinical decision support) only; output must always be clinician-reviewed.

## Layout

- `data/` — Dataset registry, provenance templates
- `training/` — LoRA finetune script, config, training_utils (provenance, model card)
- `distill/` — Knowledge distillation for smaller models
- `convert/` — ONNX, TF, TFLite conversion
- `adapters/` — LoRA adapter templates and adapter cards
- `eval/` — Eval pipeline, metrics, bias audit, sample notebook
- `deploy/` — Model server (FastAPI), edge TFLite build
- `governance/` — Model card template, lineage, DP plan
- `ci/` — GitHub Actions for model builds
- `agents/` — Agent skill wrappers (EmbedSkill, ReasonerSkill)

**CI:** Copy `model-dev/ci/model_build.yml` to `.github/workflows/model_build.yml` to run on push/PR.

## Quick start

### Smoke test (local dev)

Create a venv and install deps:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install torch transformers datasets peft accelerate
# optional: bitsandbytes, huggingface_hub
```

From **repo root**, run a smoke-test training with synthetic data (gpt2 for fast CPU):

```bash
python model-dev/training/finetune_lora.py \
  --base_model_id "gpt2" \
  --adapter_name "example_adapter" \
  --output_dir "model-dev/adapters/example_adapter" \
  --smoke_test \
  --num_train_epochs 1 \
  --per_device_train_batch_size 4
```

Replace `gpt2` with your MedGemma HF id (e.g. `google/medgemma-2b-it`) for real runs. The script writes adapter artifacts and `provenance.json` under the output dir.

### Inference server (dev)

From **repo root** or from `model-dev/deploy/modelserver`:

```bash
cd model-dev/deploy/modelserver
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Or from inside the app dir:

```bash
cd model-dev/deploy/modelserver/app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Without `MEDGEMMA_MODEL_PATH` the server runs in fallback mode (placeholder responses). Test:

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/infer_text -H "Content-Type: application/json" \
  -d '{"case_id":"test-1","age_months":24,"observations":"limited vocabulary"}'
```

### Radiology pipeline (MedGemma-4B Bone Age / ROP / Fracture)

Full production QLoRA training, merge, and eval for pediatric radiology:

```bash
# 1. Prepare data (PediRad-8K or pedirad-custom layout)
python dataset-prep/prepare_pedirad_dataset.py --raw_dir data/raw_xrays --output_dir data/pedirad-8k

# 2. QLoRA training (12GB VRAM, ~18–24h for 8K samples)
python model-dev/training/train_radiology.py --data_dir ./data/pedirad-8k --output_dir ./models/medgemma-4b-radiology

# 3. Merge adapter → production model
python model-dev/deploy/radiology_merge.py --adapter_path ./models/medgemma-4b-radiology/lora --output_path ./models/medgemma-4b-radiology-prod

# 4. Evaluate (bone age MAE, ROP AUC, fracture F1)
python -c "from model_dev.eval.radiology_metrics import RadiologyMetrics; ..."
```

See **docs/PIPELINE_RADIOLOGY.md** for dataset layout, targets (Bone Age MAE ±2.8mo, ROP AUC 0.94, Fracture F1 0.92), and frontend hook `useMedGemmaRadiology`.

### Other commands

```bash
# Run eval pipeline
python model-dev/eval/eval_pipeline.py --dataset_path ... --adapter_path ...
```
