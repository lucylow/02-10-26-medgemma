# Repo Layout Confirmation — PediScreen AI / MedGemma Impact Challenge

**Date:** 2026-02-14  
**Purpose:** Confirm actual repository structure vs. the governing instruction set before implementing the 15+ page file-by-file improvements.

---

## ✅ Confirmed Components

| Your Assumption | Actual Location | Notes |
|-----------------|-----------------|-------|
| **backend/** | `backend/` | FastAPI service with `/api/analyze`, Mongo/CloudSQL persistence |
| **model_wrapper** | `backend/app/services/model_wrapper.py` | Deterministic baseline + HF Inference API; already uses `analyze()` as primary risk logic |
| **MedGemma integration** | `backend/app/services/medgemma_service.py` | `MedGemmaService` — Vertex AI / Hugging Face; embedded in backend, not a separate server |
| **orchestrator/** | `pedi-agent-stack/orchestrator/` | Multi-agent MVP: embedding, Celery worker, `process_case` → MedGemma pipeline |
| **client/frontend** | `app/frontend/` | React (Vite) — clinician and parent views; also `src/` for landing/demo |
| **EvidenceItem / Report** | `backend/app/models/schemas.py` | `EvidenceItem(type, content, influence)` — needs extension per spec |

---

## ⚠️ Structural Differences (Adjustments Required)

### 1. No Dedicated MedGemma Server

- **Your assumption:** `medgemma-server/` or similar — a FastAPI service wrapping MedGemma (HF AutoModelForCausalLM or Vertex).
- **Reality:** MedGemma inference is **embedded** in the backend:
  - `backend/app/services/medgemma_service.py` — `MedGemmaService` class
  - `backend/app/api/infer.py` — `/api/infer` endpoint (precomputed embedding)
  - `backend/app/api/analyze.py` — `/api/analyze` calls `MedGemmaService.analyze_input()` when HF/Vertex configured

**Implication:** Part 1 of your plan can be implemented in two ways:
- **Option A:** Extract `MedGemmaService` into a new `medgemma-server/` microservice with `/infer` and strict JSON contract (matches your spec).
- **Option B:** Harden `MedGemmaService` in-place within `backend/` and expose a well-defined `/api/infer` contract; orchestrator/backend call it via HTTP or in-process.

### 2. Orchestrator MedGemma Target

- **pedi-agent-stack** uses `MEDGEMMA_URL = http://medgemma-llm:8000/infer`
- **medgemma-llm** in the stack is a **demo** service using `google/flan-t5-small`, not MedGemma
- The **main backend** (`backend/app/api/infer.py`) serves real MedGemma inference when configured

**Implication:** Orchestrator should call either:
- The new/refactored MedGemma server (if Option A), or
- `backend`’s `/api/infer` endpoint (if Option B)

### 3. Dual Backend Paths

- `backend/` — primary FastAPI app (analyze, infer, reports, etc.)
- `app/backend/` — alternate structure (Lovable/Supabase scaffold) with its own `main.py` and `/v1/process_case`

**Implication:** Focus improvements on `backend/` as the canonical service; `app/backend/` can be aligned later if needed.

### 4. Agent System Variants

- `pedi-agent-stack/orchestrator/` — Celery-based, calls embed-server + medgemma-llm
- `app/backend/orchestrator/` — integrated orchestrator (job_store, tasks, webhooks)
- `agent_system/` — `CentralOrchestrator` with `run_workflow`

**Implication:** Part 3 improvements should target `pedi-agent-stack/orchestrator/` as the primary multi-agent MVP; schemas can be shared via a common `orchestrator/schemas.py` or imported from backend.

---

## 📁 Actual Directory Map

```
02-10-26-medgemma/
├── backend/                    # Primary FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze.py      # POST /api/analyze
│   │   │   ├── infer.py        # MedGemma /api/infer
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── medgemma_service.py   # MedGemmaService (Vertex/HF)
│   │   │   ├── model_wrapper.py      # Deterministic + HF
│   │   │   ├── medsiglip_*.py        # Embedding services
│   │   │   └── ...
│   │   ├── models/schemas.py   # EvidenceItem, Report, AnalyzeResponse
│   │   └── core/config.py      # settings
│   └── tests/
├── app/
│   ├── backend/                # Alternate backend (Lovable)
│   │   ├── main.py             # /v1/process_case
│   │   └── orchestrator/
│   └── frontend/               # React (Vite) — clinician/parent UI
├── pedi-agent-stack/
│   ├── orchestrator/           # Multi-agent MVP
│   │   ├── main.py             # POST /v1/process_case
│   │   ├── tasks.py            # Celery: run_medgemma_pipeline
│   │   ├── embedding_service.py
│   │   ├── job_store.py, webhooks.py
│   │   └── ...
│   ├── medgemma-llm/           # Demo (flan-t5-small)
│   ├── embed-server/           # Mock MedSigLIP
│   └── clinician-ui/           # React clinician UI
├── pedi_screen/                # CLI package
│   └── medgemma_core/          # Inference engine, model_loader
├── model/                      # Model card, finetuning, evaluation
├── src/                        # React landing/demo
├── frontend/                   # UX guide, design tokens
├── docs/
└── configs/inference.yaml
```

---

## 🔧 Recommended Path Forward

1. **Part 1 — MedGemma Server Hardening**
   - Add `backend/app/services/medgemma_config.py` (or extend `core/config.py`) with `MEDGEMMA_*` env vars.
   - Introduce `MedGemmaInferenceRequest` / `MedGemmaInferenceResponse` Pydantic schemas in `backend/app/schemas/` or `models/`.
   - Refactor `MedGemmaService` to:
     - Use strict JSON-only prompt + parsing.
     - Support adapter loading via new `adapter_manager.py`.
     - Return schema-aligned responses with `adapter_id`, `model_name`, `schema_version`.
   - Add `/api/infer` (or `/infer`) route that accepts only the strict schema.
   - Optionally extract to `medgemma-server/` later for microservice deployment.

2. **Part 2 — Backend Model Wrapper**
   - Keep `model_wrapper.py` as primary deterministic logic (never bypassed).
   - When MedGemma is used: call the hardened `/api/infer` (or in-process `MedGemmaService`) and append as `EvidenceItem` with `type="model_text"`, `influence≈0.2–0.3`, `source_model`, `adapter_id`.
   - Extend `EvidenceItem` schema per your spec.
   - Add safety filter (banned phrases, over-confident language) before surfacing model output.

3. **Part 3 — Orchestrator**
   - Update `pedi-agent-stack/orchestrator/` to use the new MedGemma contract.
   - Add `orchestrator/schemas.py` with `EmbeddingItem`, `TemporalOutput`, `MedGemmaOutput`, `SafetyAgent` types.
   - Implement `SafetyAgent` with banned phrase list and clear ok/blocked behavior.
   - Ensure `process_case` is exception-safe and returns degraded responses on agent failure.

4. **Part 4 — Client**
   - Differentiate clinician vs. caregiver views (already partially present).
   - Add “AI insights updated” indicator for async MedGemma results.
   - Preserve offline-first patterns.

5. **Part 5 — Docs**
   - Update README sections for MedGemma config, JSON schema, adapters.
   - Add “Safety by design” and model/adapter card.

---

## Confirmation

If this layout matches your understanding and the recommended path is acceptable, you can proceed with the expanded file-by-file implementation. Any path or naming adjustments can be made during implementation.
