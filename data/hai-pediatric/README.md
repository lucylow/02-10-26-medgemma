# HAI-DEF Pediatric Task Data (~15K samples)

Place JSONL files per task:

- **asq3_scoring/**   (~5K)  — ASQ-3 auto-scoring
- **rop_detection/**  (~3K)  — ROP zone/stage
- **bone_age/**       (~4K)  — Bone age assessment
- **growth_zscore/**  (~1.5K)— Growth z-scores
- **fractures/**      (~1.5K)— Fracture classification
- **pedirad_unified/** — **PEDIRAD-001** unified fracture + bone age (production JSON for CHW)
- **chw_workflow/**   — CHW workflow generation
- **multilingual/**   — Multilingual reports

Each JSONL line: `{"instruction": "...", "output": "..."}` or task-specific fields.

**PEDIRAD-001** (Multi-label pediatric extremity fracture + bone age): output format is production JSON with `patient`, `radiology`, `fractures[]`, `risk_stratification`, `referral_timeline`, `icd10`, `chw_action`. See `hai-adaptation/PEDIRAD-001-spec.md` and `hai-adaptation/pedirad_task_config.py`.

**PediRad-8K / pedirad-custom** layout for vision training:
- `data/pedirad-custom/` or `data/pedirad-8k/`: `processed/{train,val,test}/` + `annotations/{split}_annotations.json`
- 6K train / 1K val / 1K test; 512×512 normalized hand/wrist X-rays

Run `python hai-adaptation/prepare_7_tasks.py --samples 100` to generate sample files.
