# Provenance templates

**Purpose:** Record dataset lineage, transformations, and approvals for model training.  
**Input:** Run metadata from training. **Output:** Human- and machine-readable provenance records.

## Required fields for dataset lineage

- **dataset_hash** — Content hash of dataset (e.g. SHA256 of canonical representation)
- **provenance_id** — Unique ID for this provenance record (e.g. `pediscreen-v1-20240201`)
- **curation_notes** — Free-text notes on how the dataset was curated
- **annotation_protocol** — Link or reference to annotation protocol
- **annotator_demographics_summary** — Optional; summary if known (no PII)
- **approvals** — Ethics/IRB approval references if applicable
- **retention_policy** — How long raw/derived data is retained

## Transformations to record

- Filtering (inclusion/exclusion criteria)
- Augmentation (e.g. paraphrasing, synthetic generation)
- Train/validation/test split (ratios, seed)
- Preprocessing (tokenization, normalization)

## Training run provenance (JSON)

Written by `training_utils.record_provenance()` to `model_dev/artifacts/provenance/{run_id}.json`:

- `dataset_id`, `dataset_version`
- `preprocessing_steps`
- `train_count`, `val_count`, `split_seed`
- `run_id`, `adapter_output_dir`, `base_model_id`

Acceptance: Training script refuses to run without `--dataset_provenance_id` unless `--allow-local-dev` is set.
