# Adapter Card: pedi_lang_v1 (example_adapter)

**Adapter id:** pedi_lang_v1  
**Adapter path (relative):** model-dev/adapters/example_adapter

## Overview
This adapter is a LoRA/PEFT adapter trained to produce clinician-oriented screening summaries and risk recommendations from caregiver text and (optionally) precomputed embeddings. It is **not** a diagnostic model — intended for clinician review only.

## Base model
- Base model: `<provide base model HF id here, e.g., google/medgemma-small>`
- Adapter type: LoRA / PEFT

## Training data
- Description: Small pilot dataset of CHW-collected screening notes, curated for development.
- Provenance id: `prov-example-2026-02-14` (placeholder)
- Size: ~32 examples (smoke-test); replace with production dataset details when available.
- Consent: Synthetic/dev dataset — no PHI. For real data, include consent metadata and IRB approval.

## Training procedure
- Script: `model-dev/training/finetune_lora.py`
- LoRA config: r=8, alpha=32, lora_dropout=0.05
- Optimizer & scheduler: AdamW, learning_rate=2e-4, epochs=2 (dev)
- Tokenizer: inherited from base model
- Hardware: CPU/GPU (Dev)

## Evaluation
- Metrics collected: qualitative NLG checks, clinician acceptability, simple label F1 where labels exist.
- Bias audits: Not performed for this smoke adapter. Required for production.

## Intended use
- Task: Draft clinician-ready screening summaries and risk-level suggestions (monitor / low / high)
- Intended user: trained clinicians and community health workers (CHW)
- Environment: clinical decision support (CDS) — outputs must be reviewed and confirmed by a clinician before taking action.

## Limitations and cautions
- This adapter is experimental and trained on a small dataset. It should not be used for autonomous decisions.
- Performance is unvalidated across demographic subgroups.
- Image inputs are not handled by this adapter directly — use embed server + MedGemma reasoning pipeline for multimodal cases.

## Contact & governance
- Owner: `lucylow` (repo: lucylow/02-10-26-medgemma)
- Model card & provenance: `model-dev/adapters/example_adapter/adapter_card.md`
- For production: ensure model card includes dataset hashes, IRB approvals, bias audit reports, and deployment notes.
