# Mock inference data contract

This document describes the expected shape of **mock_inference** and related fields used by the frontend and demo-server.

## mock_inference

Returned by `POST /infer` and embedded in each `mock_data/cases/*.json` case file.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `summary` | `string[]` | Yes | Bullet-point summaries for clinician view |
| `risk` | `"on_track"` \| `"monitor"` \| `"refer"` | Yes | Screening risk level |
| `recommendations` | `string[]` | Yes | Follow-up recommendations |
| `parent_text` | `string` | Yes | Parent-facing explanation |
| `explainability` | array | Yes | List of evidence items (see below) |
| `confidence` | `number` (0–1) | Yes | Model confidence |
| `adapter_id` | `string` | No | Adapter identifier |
| `model_id` | `string` | No | Base model identifier |
| `uncertainty_reason` | `string` | No | Present when confidence is low |
| `nearest_neighbors` | array | No | FAISS-style similar cases (see below) |

### explainability item

```ts
{ type: "text" | "image_region" | "nearest_neighbor"; detail: string; score?: number }
```

### nearest_neighbors item

```ts
{ case_id: string; similarity: number; thumbnail: string }
```

## Example (minimal)

```json
{
  "mock_inference": {
    "summary": ["Emerging expressive language; limited two-word phrases."],
    "risk": "monitor",
    "recommendations": [
      "Daily language modeling activities (5–10 mins)",
      "Re-screen in 3 months"
    ],
    "parent_text": "Your child may benefit from short daily language activities. Re-screen in 3 months.",
    "explainability": [
      { "type": "text", "detail": "10 words reported; no two-word phrases", "score": 0.8 }
    ],
    "confidence": 0.72,
    "adapter_id": "mock/pediscreen_v1",
    "model_id": "google/medgemma-2b-it"
  }
}
```

## Case-level fields

- `schema_version`: string (e.g. `"1.0"`) — used for validation.
- `data_quality`: string[] — e.g. `["ehr_verified","clinician_reviewed","small_n_pilot","synthetic"]`.
- `provenance`: `{ source, origin, collected_by }` — for evidence-quality UX.

Validation is implemented in `scripts/validate_mock_data.js` and optionally with a JSON schema in `mock_data/schema/case_schema.json`.
