# Canonical API Contracts

This document defines the JSON schemas for the embedding and inference APIs.

## Embedding Response (POST /embed returns)

```json
{
  "case_id": "uuid-v4",
  "embedding_b64": "<base64-of-float32-bytes>",
  "shape": [1, 256],
  "emb_version": "medsiglip-v1",
  "image_meta": {"width": 1024, "height": 768, "capture_ts": "2026-01-26T12:00:00Z"},
  "consent": {"consent_given": true, "consent_id": "uuid-v4"},
  "client_app_version": "0.3.2"
}
```

## Inference Request (POST /infer)

```json
{
  "case_id": "uuid",
  "age_months": 24,
  "observations": "Limited pincer grasp; says 10 words",
  "embedding_b64": "<...>",
  "shape": [1, 256],
  "adapter_id": "pediscreen_v1",
  "consent": {"consent_given": true, "consent_id": "uuid"}
}
```

## Inference Response (successful)

```json
{
  "case_id": "uuid",
  "result": {
    "summary": ["...", "..."],
    "risk": "monitor",
    "recommendations": ["...", "..."],
    "parent_text": "...",
    "explain": "Top factors: ...",
    "confidence": 0.72,
    "adapter_id": "pediscreen_v1",
    "model_id": "google/medgemma-2b-it"
  },
  "inference_ts": "2026-01-26T12:01:23Z"
}
```
