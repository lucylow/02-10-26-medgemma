# MedGemma-4B Radiology Production Pipeline (PediScreen AI)

Complete production pipeline for **Bone Age**, **ROP**, and **Fracture** tasks using MedGemma-4B-IT with QLoRA.

## Executive summary

| Item | Value |
|------|--------|
| **Model** | MedGemma-4B-IT (4.2GB base → Q4_K_M ~2.8GB) |
| **Dataset** | Custom pediatric radiology (X-ray, bone age, ROP Zone/Stage) |
| **Method** | QLoRA + PEFT, vision-language (CLIP-ViT + Llama 4B) |
| **Memory** | 12GB VRAM (A100/H100) \| 24GB RAM (Colab Pro) |
| **Training** | 18–24h typical (3 epochs, ~8K samples) |
| **Targets** | Bone Age MAE ±2.8mo \| ROP AUC 0.94 \| Fracture F1 0.92 |

## Dataset layout

Use either:

- **pedirad-custom** (multi-task):
  - `pedirad-custom/bone_age/{train,val,test}/` + `{split}_annotations.json`
  - `pedirad-custom/rop_screening/` (zone_i_stage2, zone_ii_stage1, normal_pupil) + annotations
  - `pedirad-custom/fractures/` (distal_radius, buckle, normal) + annotations
- **PediRad-8K** (existing): `data/pedirad-8k/annotations/{train,val,test}_annotations.json` and processed images.

Annotations: each record must include `image_path` (or `image_id`) and task-specific fields (e.g. `bone_age_months`, `age_months`, `sex` for bone age; `zone`, `stage`, `plus_disease` for ROP).

## Pipeline steps

### 1. Environment

```bash
pip install torch transformers peft bitsandbytes datasets accelerate
# Optional: pip install tensorboard
```

### 2. Dataset preparation

From raw DICOM/JPG to normalized images + annotations (PediRad-8K style):

```bash
python dataset-prep/prepare_pedirad_dataset.py --raw_dir data/raw_xrays --output_dir data/pedirad-8k --stratified_split
```

For pedirad-custom, place `{split}_annotations.json` under each task folder or under `annotations/` at root.

### 3. QLoRA training

From repo root:

```bash
# Full run (~18–24h on A100)
python model-dev/training/train_radiology.py \
  --data_dir ./pedirad-custom \
  --output_dir ./models/medgemma-4b-radiology

# Or PediRad-8K
python model-dev/training/train_radiology.py \
  --data_dir ./data/pedirad-8k \
  --output_dir ./models/medgemma-4b-radiology

# Smoke test (few steps)
python model-dev/training/train_radiology.py --data_dir ./data/pedirad-8k --smoke_test
```

Adapter is saved under `./models/medgemma-4b-radiology/lora` (default).

### 4. Merge to production model

```bash
python model-dev/deploy/radiology_merge.py \
  --adapter_path ./models/medgemma-4b-radiology/lora \
  --output_path ./models/medgemma-4b-radiology-prod
```

Output: single deployable model (~2.85GB) for inference.

### 5. Evaluate

```python
from model_dev.eval.radiology_metrics import RadiologyMetrics, parse_json_predictions

m = RadiologyMetrics()
mae = m.bone_age_mae(predictions_months, ground_truth_months)
within_2mo = m.bone_age_within_months(predictions_months, ground_truth_months, margin_months=2.0)
rop_aucs = m.rop_auc(labels_dict, predictions_dict)
fracture_metrics = m.fracture_f1(fracture_preds, fracture_gt)
```

### 6. Deploy

- **Backend**: Point `LORA_ADAPTER_PATH` or load the merged model from `medgemma-4b-radiology-prod` in your inference service (e.g. `model-dev/deploy/modelserver` or backend MedGemmaService).
- **Frontend**: Use `radiologyApi` for queue/upload/review; for direct bone age/ROP analysis, call your backend endpoint that runs the radiology model (e.g. `/api/radiology/analyze-bone-age`, `/api/radiology/analyze-rop`) with image upload. See `src/hooks/useMedGemmaRadiology.ts` for a hook interface.

### 7. Optional: Hugging Face upload

```bash
huggingface-cli upload lucylow/medgemma-4b-radiology-prod ./models/medgemma-4b-radiology-prod
```

## File reference

| Component | Path |
|-----------|------|
| Dataset processor | `model-dev/training/radiology_processor.py` |
| QLoRA training | `model-dev/training/train_radiology.py` |
| Radiology metrics | `model-dev/eval/radiology_metrics.py` |
| Merge script | `model-dev/deploy/radiology_merge.py` |
| PediRad-8K loader | `model-dev/training/pedirad_loader.py` |
| Dataset prep | `dataset-prep/prepare_pedirad_dataset.py` |

## Expected performance (targets)

- **Bone Age**: MAE ±2.8mo (clinical target ±3mo) → ~93% within 2mo
- **ROP Zone**: AUC 0.94 (Zone I sensitivity ~97%)
- **Fracture**: F1 0.92 (distal radius 95% sensitivity)
- **Growth Z-score**: r = 0.97 vs WHO standards
- **Inference**: ~2.8s (iPhone 15 Pro) when served via on-device or low-latency API
