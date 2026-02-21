# PediRad-8K Dataset Preparation

Production pipeline for **PEDIRAD-8K** (pediatric extremity X-rays) for MedGemma LoRA fine-tuning.

## Dataset specification

| Item | Target |
|------|--------|
| **Total** | 8K (6K train \| 1K val \| 1K test) |
| **Age** | 2mo–12yrs |
| **Anatomy** | Hand / wrist / forearm (distal radius focus) |
| **Formats** | DICOM → 512×512 JPG, 8-bit grayscale, bone window |
| **Labels** | Fracture type, bone age (Greulich-Pyle), clinical context |

## Directory structure (output)

```
data/pedirad-8k/
├── raw/                    # Optional; or use data/raw_xrays
├── processed/
│   ├── train/
│   ├── val/
│   └── test/
├── annotations/
│   ├── train_annotations.json
│   ├── val_annotations.json
│   └── test_annotations.json
├── processing_log.json
└── quality_report.json
```

## Setup (≈5 min)

```bash
pip install -r dataset-prep/requirements.txt
```

## Organize raw images

**Option A – Pre-split (recommended)**  
Place DICOM/JPG into train/val/test so the pipeline keeps splits:

```bash
mkdir -p data/raw_xrays/{train,val,test}
# Copy files; naming convention: patient_048m_M_buckle_distal_radius.dcm
```

**Option B – Single pool**  
Put all images under one folder (e.g. `data/raw_xrays/train`) and use stratified split:

```bash
mkdir -p data/raw_xrays/train
# Copy all 8K here, then run with --stratified_split
```

## Run pipeline (≈15 min for 8K)

```bash
# From repo root
python dataset-prep/prepare_pedirad_dataset.py
```

With custom paths:

```bash
python dataset-prep/prepare_pedirad_dataset.py \
  --raw_dir data/raw_xrays \
  --output_dir data/pedirad-8k
```

Single-pool → 80/10/10 stratified split:

```bash
python dataset-prep/prepare_pedirad_dataset.py --stratified_split
```

## Verify output

```bash
wc -l data/pedirad-8k/annotations/*.json
# Expect: train ~6K samples, val ~1K, test ~1K (line count ≠ sample count; use JSON length)
python -c "
import json
for s in ('train','val','test'):
    with open(f'data/pedirad-8k/annotations/{s}_annotations.json') as f:
        print(s, len(json.load(f)))
"
```

## LoRA training integration

1. **Export JSONL** (text-only for `finetune_lora.py`):

```python
import sys
sys.path.insert(0, 'model-dev/training')
from pedirad_loader import export_pedirad_jsonl
export_pedirad_jsonl('data/pedirad-8k', 'data/pedirad-8k/train.jsonl', split='train')
```

2. **Train LoRA** (reference dataset in provenance):

```bash
python model-dev/training/finetune_lora.py \
  --base_model_id "google/medgemma-2-2b-it" \
  --adapter_name pedirad_fracture_v1 \
  --dataset_path data/pedirad-8k/train.jsonl \
  --output_dir adapters/pedirad_fracture_v1 \
  --dataset_provenance_id pedirad-8k
```

3. **Load dataset in code** (for custom VLM training with images):

```python
from model_dev.training.pedirad_loader import load_pedirad_dataset
ds = load_pedirad_dataset("train", data_root="data/pedirad-8k")
# ds has "prompt", "target", "image_path"
```

## Checklist

- [ ] 8K pediatric X-ray dataset (6K / 1K / 1K)
- [ ] DICOM → JPG normalization (512×512, bone window)
- [ ] Clinical annotations (fracture + bone age)
- [ ] Quality validation (default threshold 0.85)
- [ ] Stratified splits (age/sex/fracture) when using `--stratified_split`
- [ ] LoRA-ready JSON/JSONL format
- [ ] Dataset registered in `model-dev/data/dataset_registry.yml` (id: `pedirad-8k`)

## Expected statistics (example)

- **Total images**: 8,000 (6K / 1K / 1K)
- **Fracture prevalence**: ~55%
- **Age range**: 2–144 months (mean ~48 mo)
- **Sex**: ~52% M / 48% F
- **Quality score**: ≥ 0.85 (configurable)

Pipeline complete: 8K clinical dataset → MedGemma LoRA training → CHW fracture screening.
