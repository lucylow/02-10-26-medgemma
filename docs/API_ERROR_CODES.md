# API Error Response Schema & Error Codes

All API errors return a standardized JSON structure for predictable client handling.

## Error Response Schema

```json
{
  "code": "INVALID_PAYLOAD",
  "message": "Human-readable error message",
  "details": { "field": "age_months", "expected": "0-240" }
}
```

| Field    | Type   | Required | Description                                      |
|----------|--------|----------|--------------------------------------------------|
| `code`   | string | Yes      | Machine-readable error code for client logic     |
| `message`| string | Yes      | Human-readable error message                     |
| `details`| object | No       | Optional extra context (field errors, hints)     |

## Standard Error Codes

| Code                    | HTTP Status | Description                                           |
|-------------------------|-------------|-------------------------------------------------------|
| `INVALID_PAYLOAD`       | 400         | Request body/params invalid (e.g. non-integer age)    |
| `VALIDATION_ERROR`      | 422         | Pydantic/request validation failed                    |
| `EMBEDDING_ERROR`       | 400         | General embedding-related error                       |
| `EMBEDDING_PARSE_ERROR` | 400         | Base64 embedding parse failed or shape mismatch       |
| `EMBEDDING_SHAPE_MISMATCH` | 400      | Embedding shape does not match expected               |
| `AUTH_FAIL`             | 401         | Invalid or missing API key                            |
| `INVALID_IMAGE`         | 400         | Image file invalid or unreadable                      |
| `PAYLOAD_TOO_LARGE`     | 413         | Request body exceeds max size                         |
| `SERVICE_UNAVAILABLE`   | 503         | Backend service (e.g. MedSigLIP) not configured       |
| `MODEL_LOAD_FAIL`       | 503         | MedGemma/model not configured or failed to load       |
| `INFERENCE_FAILED`      | 500         | Model inference failed                                |
| `ANALYSIS_FAILED`       | 500         | Screening/analysis failed                             |
| `NOT_FOUND`             | 404         | Resource not found                                    |
| `SAFE_ERROR`            | 500         | Generic fallback for unhandled exceptions             |

## Example Responses

### 400 – Invalid payload

```json
{
  "code": "INVALID_PAYLOAD",
  "message": "childAge must be an integer representing months",
  "details": { "field": "childAge", "expected": "integer" }
}
```

### 422 – Validation error

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "validation_errors": [
      {
        "loc": ["body", "age_months"],
        "msg": "ensure this value is greater than or equal to 0",
        "type": "value_error.number.not_ge"
      }
    ]
  }
}
```

### 401 – Auth failure

```json
{
  "code": "AUTH_FAIL",
  "message": "Invalid or missing API Key"
}
```

### 503 – Model not configured

```json
{
  "code": "MODEL_LOAD_FAIL",
  "message": "MedGemma not configured (HF_MODEL+HF_API_KEY or Vertex required)"
}
```

## Client Handling

1. Check `code` for programmatic branching (e.g. retry on `SERVICE_UNAVAILABLE`).
2. Display `message` to users.
3. Use `details` for field-level validation UI or debugging.
