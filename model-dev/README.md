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

## Quick start

```bash
# Smoke test LoRA finetune (requires --allow-local-dev or valid provenance)
python model-dev/training/finetune_lora.py --dataset_provenance_id dev-smoke --train_file data/synth_train.jsonl --adapter_output_dir model-dev/adapters/smoke_test --allow-local-dev

# Run inference server (mock)
cd model-dev/deploy/modelserver && uvicorn app.main:app --reload

# Run eval pipeline
python model-dev/eval/eval_pipeline.py --dataset_path ... --adapter_path ...
```
