# HAI-DEF Pediatric Task Data (~15K samples)

Place JSONL files per task:

- **asq3_scoring/**   (~5K)  — ASQ-3 auto-scoring
- **rop_detection/**  (~3K)  — ROP zone/stage
- **bone_age/**       (~4K)  — Bone age assessment
- **growth_zscore/**(~1.5K) — Growth z-scores
- **fractures/**      (~1.5K)— Fracture classification
- **chw_workflow/**   — CHW workflow generation
- **multilingual/**   — Multilingual reports

Each JSONL line: `{"instruction": "...", "output": "..."}` or task-specific fields.

Run `python hai-adaptation/prepare_7_tasks.py --samples 100` to generate sample files.
