# Error Handling Strategy & Standard Patterns

This document defines how errors are classified, reported, logged, and recovered across the PediScreen/MedGemma stack.

## Error Classification

- **Transient**: Retryable (e.g., network timeout, GPU OOM, rate limit). Retry with backoff.
- **Permanent**: Do not retry (e.g., invalid model name, auth failure). Return 4xx and log.
- **Operational**: Resource limits (e.g., payload too large, rate limit). Return 4xx/429.
- **External**: Third-party failures (e.g., Hugging Face, Vertex). Retry then circuit-break.

## API Error Response Format

All API errors MUST return this JSON structure. No stack traces or internal details are sent to clients.

```json
{
  "error": {
    "code": "INFERENCE_FAILED",
    "message": "High level message for client",
    "details": "Optional technical details for logs only",
    "request_id": "uuid-v4"
  }
}
```

- `code`: Machine-readable (e.g., `INFERENCE_FAILED`, `VALIDATION_ERROR`, `SERVICE_UNAVAILABLE`).
- `message`: Human-readable, safe to show in UI.
- `details`: Optional; only in debug mode or server-side logs—never expose PII or stack traces to client.
- `request_id`: UUID for support and log correlation. Always include; clients should send it back when reporting issues.

## Logging

- **Format**: Structured JSON logs.
- **Keys**: `timestamp`, `level`, `module`, `request_id`, `user_pseudonym`, `case_id`, `error_type`, `error_message`, `stacktrace` (server-side only, never to client).
- **Levels**: DEBUG (dev), INFO (normal), WARNING (degraded/fallback), ERROR (failure), CRITICAL (unrecoverable).
- **PII**: Never log raw images or PHI. Log pseudonyms and case IDs only where needed for audit.

## Auditing

For every inference:

- Record a **compact audit event** (e.g., in `data/audit.log` or DB):
  - `request_id`, `ts`, `model_id`, `adapter_id`, `emb_version`, `success`, `fallback_used`, optional `error_msg`.
- **Never** write raw images; only embedding metadata and provenance.

## Retry Policy (Transient Errors)

- **Strategy**: Exponential backoff with jitter.
- **Parameters**: Base delay 0.5s, max backoff 8s, max 5 attempts.
- **Applicable to**: Model load, adapter download, HF/Vertex API calls, transient IO.

## Circuit Breaker

- **Trip condition**: 5 errors within 1 minute (configurable window).
- **Cooldown**: 30s before allowing new attempts (configurable).
- **Use**: Adapter downloads, external embedding/inference APIs. When open, fall back to cached or mock.

## Fallback Chain

On model/inference error:

1. **On-model-error** → try adapter fallback if applicable.
2. **Adapter/call failure** → try cached embeddings or cached inference if available.
3. **Otherwise** → return **deterministic mock inference** (same inputs → same mock output for demos and tests).
4. Log and audit with `fallback_used: true`.

## Summary Checklist

- [ ] All errors return the standard `error` JSON schema with `request_id`.
- [ ] Transient errors use exponential-backoff retries (max 5, base 0.5s, max 8s).
- [ ] Circuit breaker wraps external calls (adapter fetch, HF, Vertex); fallback when open.
- [ ] Every inference produces an audit event with `success`, `fallback_used`, and no raw images.
- [ ] Logs are structured JSON; stack traces only in server logs.
