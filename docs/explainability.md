# AI Explainability & Trust — PediScreen AI

This document describes the explainability outputs, reasoning chain interpretation, evidence types, and views for clinicians vs. patients.

## Overview

PediScreen AI produces **explainable, clinically meaningful outputs** that clinicians and patients can trust. The system provides:

- **Structured inference outputs** with confidence, chain-of-reasoning, and evidence references
- **Visualizable explainability artifacts** (reasoning timeline, evidence clusters, confidence gauge)
- **Clinician-facing explanation panel** with tabbed Summary | Evidence | Reasoning
- **Patient-friendly communication** via plain-language templates
- **Audit trails** connecting reasoning to decisions

## Output Fields

### InferenceExplainable Schema

All `/api/infer` responses follow the `InferenceExplainable` schema:

| Field | Type | Description |
|-------|------|-------------|
| `summary` | `string[]` | Plain-language bullet summary (2–4 points) |
| `risk` | `string` | Risk level: `low`, `monitor`, `high`, `refer` |
| `confidence` | `float` | Model confidence in prediction (0–1) |
| `evidence` | `EvidenceItem[]` | Evidence items backing the prediction |
| `reasoning_chain` | `string[]` | Ordered step-by-step reasoning |
| `model_provenance` | `object` | `adapter_id`, `model_id`, `prompt_hash`, etc. |
| `recommendations` | `string[]` | Clinical recommendations |
| `parent_text` | `string` | Patient-friendly plain language summary |

### EvidenceItem

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | `text`, `image_region`, `nearest_neighbor`, `questionnaire_score` |
| `description` | `string` | Human-readable description |
| `reference_ids` | `string[]` | IDs referencing source (e.g., screening_id, neighbor_case_id) |
| `influence` | `float?` | Relative influence on prediction (0–1) |

## Reasoning Chain Interpretation

The `reasoning_chain` is an ordered list of logical steps the model took to reach its conclusion. Typical structure:

1. **Input interpretation** — How the model understood the child's age, observations, and visual evidence
2. **Evidence synthesis** — How it combined text and visual signals
3. **Risk assessment** — How it arrived at the final risk level

Each step is a short sentence. Clinicians can expand/collapse steps in the UI to trace the model's logic.

## Evidence Types

- **text** — From parent observations, questionnaire scores, or model explanation
- **image_region** — Visual features (e.g., drawing analysis) that influenced the assessment
- **nearest_neighbor** — Similar de-identified cases from the FAISS index (when available)
- **questionnaire_score** — Structured assessment scores

## Patient vs. Clinician Views

### Clinician View

- Full **InferenceExplanationPanel** with Summary, Evidence, and Reasoning tabs
- Confidence gauge with color semantics (green/orange/red)
- Collapsible reasoning steps
- Nearest neighbor thumbnails (when available)
- Model provenance badges (adapter_id, model_id)
- Clinician override with rationale capture

### Patient View

- **Patient-friendly text** via `toPatientText()` templates
- Risk level translated to plain language (e.g., "some areas to watch")
- Bullet summary without technical jargon
- Disclaimer: "This is a draft interpretation to discuss with your clinician."

## Audit & Accountability

- **Inference runs** are logged with: `inference_id`, `risk`, `confidence`, `reasoning_chain_hashes`, `evidence_refs`, `adapter_id`, `model_id`
- **Clinician overrides** are stored with `override_risk` and `rationale` in the report and audit log
- Audit entries are HMAC-chained for tamper evidence

## Related Files

- `backend/app/models/explainability_schema.py` — Pydantic schema
- `backend/app/services/evidence_capture.py` — FAISS nearest neighbors
- `backend/prompts/explainable_prompts.json` — MedGemma prompt templates
- `src/components/pediscreen/InferenceExplanationPanel.tsx` — Clinician UI
- `src/utils/patientExplainTemplates.ts` — Patient-friendly templates
