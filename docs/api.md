# API Specification

## Inference Endpoints

### POST /api/infer (Backend)

Privacy-first inference with precomputed embedding. Raw images never leave device.

**Request:**
```json
{
  "case_id": "unique-case-id",
  "age_months": 24,
  "observations": "Caregiver observations text",
  "embedding_b64": "<base64-encoded float32 bytes>",
  "shape": [1, 256],
  "emb_version": "medsiglip-v1",
  "consent_id": "optional-consent-id",
  "user_id_pseudonym": "optional-pseudonym"
}
```

**Response (200):**
```json
{
  "case_id": "unique-case-id",
  "result": {
    "summary": "...",
    "risk": "monitor",
    "recommendations": ["...", "..."],
    "parent_text": "...",
    "explain": "...",
    "confidence": 0.5
  },
  "provenance": {
    "prompt_hash": "...",
    "input_hash": "...",
    "inference_time_ms": 420
  },
  "inference_time_ms": 420
}
```

**Status codes:**
- 400: `EMBEDDING_PARSE_ERROR` — Invalid embedding_b64 or shape mismatch
- 422: `VALIDATION_ERROR` — Request validation failed
- 500: `INFERENCE_FAILED` — Model inference failed
- 503: `MODEL_LOAD_FAIL` — MedGemma not configured

---

### POST /infer_embedding (Model Server)

Local MedGemma inference with precomputed embedding.

**Request:**
```json
{
  "case_id": "optional",
  "age_months": 24,
  "observations": "Caregiver observations",
  "embedding_b64": "<base64 float32 bytes>",
  "shape": [1, 256],
  "max_new_tokens": 256,
  "temperature": 0.0
}
```

**Response (200):**
```json
{
  "success": true,
  "case_id": "...",
  "result": {
    "text": "Generated clinical summary...",
    "inference_time_s": 0.42
  }
}
```

---

## Embedding Contract

- **Format:** Base64-encoded raw float32 bytes
- **Shape:** Typically `[1, 256]` for MedSigLIP
- **Validation:** Byte length must equal `prod(shape) * 4`
- **Normalization:** Client should L2-normalize before encoding
