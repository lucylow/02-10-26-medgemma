## MedGemma Impact Challenge — PediScreen AI Submission

This document organizes key artifacts and narrative for a Kaggle-style competition submission based on this repository.

### 1. Competition Overview

- **Challenge**: MedGemma Impact Challenge 2026 (pediatric developmental screening focus).
- **Project**: PediScreen AI — MedGemma-powered pediatric developmental screening assistant.
- **Team**: Fill in collaborators, institutions, and roles here.

### 2. Technical Summary

- **Model**: `google/medgemma-2b-it` or `google/medgemma-4b-it` with LoRA/QLoRA adapters.
- **Task**: Map age, caregiver observations, and optional visual embeddings to calibrated developmental risk flags and structured summaries.
- **Architecture**: Embedding-first, human-in-the-loop CDS platform. See `README.md` and `docs/architecture.md` for full diagrams.

### 3. Reproducibility

High-level reproduction steps (to be adapted for the final competition rules):

1. Prepare datasets with `training/prepare-datasets.py`.
2. Fine-tune MedGemma with `training/finetune_lora.py` or `training/train.py` using `training/lora_config.yaml`.
3. Run evaluation scripts under `eval/` to generate validation metrics and calibration curves.
4. Package the serving stack (FastAPI backend + optional frontend) for submission or demo as required.

### 4. Results Summary

- Link or copy key metrics (AUROC, calibration, fairness slices) from validation reports under `validation/` and `docs/`.
- Summarize key strengths and limitations in a way that is accessible to competition reviewers.

This file is intentionally lightweight; the full scientific and engineering detail lives in the rest of the repository and referenced docs.

