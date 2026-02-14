# Feedback Loop: Clinician Feedback & Model Improvement

## Overview

PediScreen AI implements a **feedback loop** where clinicians can provide structured, auditable feedback on AI inference outputs. This feedback is stored, linked to specific inference IDs, and used for model refinement and performance tracking.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Screening  │────▶│   Inference  │────▶│  Results + UI    │
│  (Analyze)  │     │  (MedGemma)  │     │  feedback_allowed│
└─────────────┘     └──────────────┘     └────────┬────────┘
       │                    │                      │
       │                    ▼                      ▼
       │             ┌──────────────┐     ┌─────────────────┐
       │             │  inferences  │     │ InferenceFeedback│
       │             │  table       │     │ Form + FeedbackList
       │             └──────────────┘     └────────┬────────┘
       │                    │                      │
       │                    │                      ▼
       │                    │             ┌─────────────────┐
       │                    │             │ clinician_      │
       │                    │             │ feedback table  │
       │                    │             └────────┬────────┘
       │                    │                      │
       │                    │                      ▼
       │                    │             ┌─────────────────┐
       │                    └────────────▶│  Audit Log      │
       │                                   │  (clinician_    │
       │                                   │   feedback)     │
       │                                   └────────┬────────┘
       │                                            │
       ▼                                            ▼
┌──────────────┐                           ┌─────────────────┐
│ export_      │                           │ Retraining       │
│ feedback.py  │──────────────────────────▶│ Pipeline        │
└──────────────┘                           │ (LoRA/fine-tune)│
                                           └─────────────────┘
```

## Data Flow

1. **Inference**: When a screening is analyzed (`/api/analyze` or `/api/infer`), an `inference_id` (UUID) is generated and stored in the `inferences` table. The response includes `feedback_allowed: true` and `feedback_url`.

2. **Feedback Submission**: Clinicians submit feedback via `POST /api/feedback` with:
   - `inference_id`, `case_id`
   - `feedback_type`: `correction` | `rating` | `comment`
   - `corrected_risk`, `corrected_summary`, `rating`, `comment`, `clinician_notes`

3. **Storage**: Feedback is stored in `clinician_feedback` with foreign key to `inferences`. Each submission is audited via `write_audit(action="clinician_feedback", ...)`.

4. **Retrieval**: `GET /api/feedback/inference/{id}` and `GET /api/feedback/case/{case_id}` return feedback for a given inference or case.

5. **Export**: `python scripts/export_feedback.py --output feedback_dataset.jsonl` produces JSONL for model retraining:
   ```json
   {"input_features": {...}, "ai_risk": "monitor", "corrected_risk": "refer", "summary_in": "...", "summary_out": "...", "comment": "...", "timestamp": "..."}
   ```

6. **Retraining**: The export file is ingested by fine-tuning notebooks/scripts to augment training examples with clinician-corrected labels.

## How Feedback Improves the Model

- **Corrections**: When clinicians correct risk levels or summaries, these become labeled examples for supervised fine-tuning (e.g., LoRA).
- **Ratings**: 1–5 star ratings provide signal for reward modeling or preference learning.
- **Comments**: Free-text comments can inform prompt engineering and model card updates.

## Database Schema

See `supabase/migrations/20250214100000_add_clinician_feedback.sql`:

- `inferences`: `inference_id`, `case_id`, `screening_id`, `input_hash`, `result_summary`, `result_risk`, `created_at`
- `clinician_feedback`: `feedback_id`, `case_id`, `inference_id`, `clinician_id`, `feedback_type`, `corrected_risk`, `corrected_summary`, `rating`, `comment`, `clinician_notes`, `metadata`, `provided_at`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/feedback` | Create feedback |
| GET | `/api/feedback/inference/{inference_id}` | Get feedback for inference |
| GET | `/api/feedback/case/{case_id}` | Get feedback for case |
| DELETE | `/api/feedback/{feedback_id}` | (501) Not yet implemented |

## Trust & Privacy

- **Confidentiality**: Feedback is confidential and used only for model refinement.
- **Auditability**: All feedback events are logged in the audit trail.
- **Clinician identity**: Tied to Supabase Auth or API key (dev placeholder).
