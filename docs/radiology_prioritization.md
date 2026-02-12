# Radiology Case Prioritization

AI-assisted urgency labeling and automatic queue prioritization for radiology studies. Clinical decision-support only; clinician review and override required.

## Architecture

```
Study Upload (DICOM/PNG/JPG) → MedSigLIP / MedGemma Vision → Urgency Scoring → Priority Classifier
    → Radiology Queue (Sorted) → Radiologist Review + Override
```

## Data Model (MongoDB)

The `radiology_studies` collection stores:

| Field | Type | Description |
|-------|------|-------------|
| study_id | string | Primary identifier |
| patient_id | string | Patient identifier |
| modality | string | XR, CT, MR, US |
| body_part | string | Optional |
| uploaded_at | datetime | Upload timestamp |
| priority_score | float | AI risk score (0–1) |
| priority_label | string | stat \| urgent \| routine |
| status | string | pending \| reviewed \| signed |
| ai_summary | string | AI findings (non-diagnostic) |
| override_priority | string | Clinician override |
| reviewed_by | string | Reviewer ID |
| reviewed_at | datetime | Review timestamp |
| explainability_image | binary | Grad-CAM style heatmap overlay (optional) |

## API Endpoints

- `POST /api/radiology/upload` — Upload study with image (DICOM or PNG/JPG); AI returns suggested priority
- `GET /api/radiology/queue` — Sorted worklist (stat > urgent > routine, FIFO within)
- `POST /api/radiology/{study_id}/review` — Clinician override; set final priority; optionally pushes HL7 ORU^R01
- `GET /api/radiology/{study_id}/explainability` — Grad-CAM style heatmap image (auth: header or ?api_key=)
- `GET /api/radiology/benchmark` — Time-to-read reduction metrics (prioritized vs baseline)

## Priority Labels (Non-Diagnostic)

- **stat** — Highest priority, bubbles to top of queue
- **urgent** — Elevated priority
- **routine** — Standard priority

## Environment

- `VERTEX_RADIOLOGY_ENDPOINT_ID` — Optional dedicated Vertex endpoint for radiology triage
- Uses existing `VERTEX_VISION_ENDPOINT_ID` / MedGemmaService when radiology endpoint not set
- `HL7_HOST`, `HL7_PORT` (default 2575) — Push ORU^R01 to EHR on review (optional)
- `VITE_API_KEY` — Frontend API key (default: dev-example-key)

## DICOM Ingestion

- Upload accepts `.dcm` / `.dicom`; pydicom converts to PNG for MedSigLIP/MedGemma
- Windowing applied when WindowCenter/WindowWidth present

## HL7 ORU^R01

- On clinician review, when `HL7_HOST` is set, sends standard ORU^R01 to EHR
- OBX segments: AI_PRIORITY, AI_SUMMARY

## Explainability

- Grad-CAM style heatmap generated at upload; stored as `explainability_image`
- When vision model provides `activation_map`, used; otherwise synthetic center-weighted map

## SQL Reference (Postgres)

For teams using Postgres instead of MongoDB:

```sql
CREATE TABLE IF NOT EXISTS radiology_studies (
  study_id TEXT PRIMARY KEY,
  patient_id TEXT,
  modality TEXT,
  body_part TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  priority_score FLOAT,
  priority_label TEXT,
  status TEXT DEFAULT 'pending',
  ai_summary TEXT,
  override_priority TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);
```

## Safety

- AI suggests urgency only; never diagnoses
- Human-in-the-loop enforced
- Conservative thresholds (0.85 stat, 0.60 urgent)
- Complete audit trail (reviewed_by, reviewed_at)
