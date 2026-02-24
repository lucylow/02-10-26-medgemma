# Cursor AI Composer Prompt: HAI-DEF Model Adaptation

**25+ Page Production Pipeline for lucylow/02-10-26-medgemma**  
MedGemma Impact Challenge — HAI-DEF Pre-release Adaptation — 7 NEW Pediatric Tasks — Kaggle Gold Submission

---

## 1. HAI-DEF ADAPTATION STRATEGY

**Repository target**

- **Repo**: `lucylow/02-10-26-medgemma`
- **Baseline**: Existing PediScreen training pipeline and app (see `AGENTS.md`, `docs/CURSOR_PROMPT_PEDISCREEN_TRAINING_PIPELINE.md`).
- **This prompt**: Adds a **new HAI-DEF adaptation layer** on top of MedGemma for 7 pediatric tasks.

**Model & adaptation**

- **Base model**: `MedGemma-4B-IT-Q4_K_M` (HAI-DEF pre-release, vision-language).
- **Adaptation**: **QLoRA PEFT** (~2.8M trainable parameters) for 7 new pediatric tasks the base HAI-DEF model was not originally trained for.
- **Goal**: Production-ready, on-device/edge-compatible MedGemma variant; preserve HAI-DEF capabilities; achieve target clinical metrics; ~2.85GB footprint, ~2.2s E2E mobile inference.

**HAI-DEF compliance**

- Complete documentation of adaptation targets and clinical tasks; QLoRA + multi-task setup reproducible.
- Clinical validation: ≥15K labeled samples; task-specific metrics; centralized validator `hai-adaptation/hai_validator.py`.
- Production: exportable artifacts under `assets/models/hai-pedifine/`; React Native hook for 7 tasks; Kaggle-ready narrative.

**Kaggle impact targets**: HAI-DEF 15/15 | Innovation 10/10 | Execution 10/10

---

## 2. REPOSITORY ARCHITECTURE EXTENSIONS

```
lucylow/02-10-26-medgemma/
├── hai-adaptation/                 # NEW: 7-task HAI-DEF pipeline
│   ├── __init__.py
│   ├── task_datasets.py           # Task-specific dataset builders
│   ├── train_hai_tasks.py         # Multi-task QLoRA training
│   ├── hai_validator.py           # HAI-DEF metrics & certification
│   ├── deploy_hai_model.py        # Merge, export, upload
│   └── prepare_7_tasks.py         # Data prep / split utility
├── data/hai-pediatric/            # 15K curated task samples (spec)
│   ├── asq3_scoring/ (~5K)
│   ├── rop_detection/ (~3K)
│   ├── bone_age/ (~4K)
│   ├── growth_zscore/ (~1.5K)
│   └── fractures/ (~1.5K)
├── src/hooks/useHAIPediScreen.ts  # 7-task inference hook
└── assets/models/hai-pedifine/    # Exported model (~2.85GB)
```

Do not break existing `training/**` and app flows. Treat `hai-adaptation/**` as a parallel, self-contained pipeline.

---

## 3. 7 USEFUL TASKS (Originally NOT Trained For)

| # | Task | Target Metric | Notes |
|---|------|----------------|-------|
| 1 | ASQ-3 Auto-Scoring | r=0.978 | 24mo speech → JSON risk |
| 2 | ROP Zone/Stage Detection | Zone I sens 97%, AUC 0.941 | Zone I–III, Stage 1–3, Plus |
| 3 | Bone Age Assessment | MAE ±2.6mo | Greulich–Pyle |
| 4 | Growth Z-Score Tracking | r=0.97 | WHO standards |
| 5 | Fracture Classification | F1=0.94 | Distal radius focus |
| 6 | CHW Workflow Generation | accuracy 0.962 | 2-tap screening PDFs |
| 7 | Multilingual Risk Reports | BLEU 0.94 | 12 languages + RTL |

---

## 4. TASK 1 — ASQ-3 AUTO-SCORING

**Data & format** (in `hai-adaptation/task_datasets.py`):

- `ASQ3Scorer.format_training_data()` → list of `{ "instruction": "...", "output": "<JSON>" }`.
- Instruction: CHW observation, milestones missed, ASQ-3 domain scores.
- Output: `risk_level`, `confidence`, `asq3_composite`, `percentile`, `icd10`, `action`, `followup_days`.
- Composer: generalize to read from `data/hai-pediatric/asq3_scoring/` and emit HF Dataset; add `task_name: "asq3"`.

---

## 5. TASK 2 — ROP ZONE/STAGE

- `ROPDetector.format_rop_data()`: instruction (GA, postnatal age, fundus description) → JSON: `zone`, `stage`, `plus_disease`, `risk_level`, `treatment`, `followup_days`.
- Wire to fundus image paths in `data/hai-pediatric/rop_detection/`; multi-modal loader with `image_path`.

---

## 6. TASK 3 — BONE AGE

- `BoneAgeAssessor.format_bone_age_data()`: hand X-ray context → JSON: `bone_age_months`, `chronological_age_months`, `z_score`, `maturity_stage`, `endocrine_referral`, `icd10`.
- Target MAE ≤ 3.0 months (aim 2.6). Wire to `data/hai-pediatric/bone_age/`.

---

## 7. TASKS 4–7 — BUILDERS

- **Growth**: `GrowthZScoreDataset` — anthropometrics → WHO Z-scores, risk, follow-up.
- **Fracture**: `FractureDataset` — X-ray → fracture type, displacement, ortho urgency.
- **CHW Workflow**: `CHWWorkflowDataset` — screening context → 2-tap workflow/PDF text.
- **Multilingual**: `MultilingualReportDataset` — result + language → parent-friendly report.

Uniform record: `{ "task_name", "instruction", "output", "image_path" (optional) }`.

---

## 8. MULTI-TASK QLoRA TRAINING

**File**: `hai-adaptation/train_hai_tasks.py`

- Config: `lora_r=32`, `lora_alpha=64`, `target_modules`: q_proj, v_proj, gate_proj, up_proj, `multi_modal_projector`; batch 4, grad_accum 8, lr 1.5e-4, max_steps 10_000.
- `HAIPediFineTuner`: `create_multitask_dataset()` (combine 7 task builders), `setup_hai_model()` (BitsAndBytes 4-bit, PEFT LoRA on `AutoModelForVision2Seq`), `train_hai_pipeline()` (Trainer, eval steps, TensorBoard).
- Base: `google/medgemma-4b-it`. CLI: `--max_steps`, `--seed`, `--tasks`, `--output_dir`.

---

## 9. REACT 7-TASK HOOK

**File**: `src/hooks/useHAIPediScreen.ts`

- Export `useHAIPediScreen()` with: `analyzeASQ3`, `analyzeROP`, `assessBoneAge`, `trackGrowth`, `detectFractures`, `generateCHWWorkflow`, `generateMultilingualReport`.
- Each calls `runHAIModel(task, payload)` (implement as backend `/api/hai-infer` or on-device runtime).
- Types: minimal interfaces in `src/types/hai.ts` or inline; align with existing `MedGemmaReport` where applicable.

---

## 10. HAI-DEF VALIDATION

**File**: `hai-adaptation/hai_validator.py`

- `HAIValidator.validate_7_tasks()` → `HAIValidationMetrics` (all 7 metrics).
- Gate: e.g. `asq3_correlation > 0.97`, `rop_zone_auc > 0.93`, `bone_age_mae < 3.0` → print "HAI-DEF GOLD CERTIFIED" and `generate_certification()` (write `hai_def_report.json` to model dir).

---

## 11. DEPLOYMENT PIPELINE

**File**: `hai-adaptation/deploy_hai_model.py` — merge PEFT, export, copy to `assets/models/hai-pedifine/`, optional HF upload.

**Runbook** (from repo root):

```bash
pip install torch==2.1.0 transformers==4.36.0 peft==0.7.1 bitsandbytes==0.41.3 datasets==2.14.6
PYTHONPATH=hai-adaptation python hai-adaptation/prepare_7_tasks.py --input-root data/hai-pediatric --output-dataset ./data/hai-pediatric/hai_7_task_dataset
PYTHONPATH=hai-adaptation python hai-adaptation/train_hai_tasks.py --dataset ./data/hai-pediatric/hai_7_task_dataset --output-dir ./models/hai-pedifine-v1.0
python hai-adaptation/deploy_hai_model.py --peft-path ./models/hai-pedifine-v1.0 --base-model google/medgemma-4b-it --export-dir ./assets/models/hai-pedifine
PYTHONPATH=hai-adaptation python hai-adaptation/hai_validator.py
```

---

## 12. KAGGLE SUBMISSION NARRATIVE

Create `docs/KAGGLE_HAI_DEF_ADAPTATION.md`: title "PediScreen AI – HAI-DEF Adaptation"; list 7 tasks with metrics; QLoRA specs (2.8M params, ~14h, ~2.2s inference, ~2.85GB); HAI-DEF compliance bullets; live demo link (Replit); Cursor execution checklist (all items achievable from clean clone).

---

## 13. CURSOR EXECUTION CHECKLIST

- [ ] HAI-DEF pre-release adaptation on MedGemma-4B-IT
- [ ] 7 new pediatric tasks (ASQ-3 → ROP → Bone Age → Growth → Fractures → CHW workflows → Multilingual)
- [ ] QLoRA multi-task script; 2.8M params; data prep ≥15K samples
- [ ] Central HAI-DEF validator; certification artifact
- [ ] Production hook `useHAIPediScreen`; exported model in `assets/models/hai-pedifine/`
- [ ] End-to-end runbook; Kaggle narrative doc

**Performance targets**: ASQ-3 r≈0.978 | ROP AUC≈0.941 | Bone Age MAE≈2.6mo | Inference ~2.2s | 7 tasks complete | HAI-DEF 15/15 | Kaggle Gold Certified

---

*Cursor: Deploy HAI-DEF adaptation in lucylow/02-10-26-medgemma → 7-task pediatric screening specialist → production React Native → Kaggle Innovation Gold.*
