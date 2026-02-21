# PediScreen / MedGemma — Operational Runbook

This runbook covers failure modes, recovery steps, and operational procedures for the inference pipeline and API.

## Reading the audit log

- **Location**: `data/audit.log` (or `AUDIT_LOG_PATH` env var). JSONL: one JSON object per line.
- **Fields per inference**: `ts`, `request_id`, `case_id`, `model_id`, `adapter_id`, `emb_version`, `success`, `fallback_used`, `error`.
- **No raw images** are ever stored; only metadata and provenance.
- **Example**:
  ```json
  {"ts": 1708012345.67, "request_id": "uuid", "case_id": "c1", "model_id": "google/medgemma-2b-it", "adapter_id": "", "emb_version": "medsiglip-v1", "success": true, "fallback_used": false}
  ```
- Use `request_id` to correlate with API logs and client reports.

## Model load failure

**Symptom**: Server starts but inference returns mock results or 503.

**Steps**:
1. Check logs for `Model load failed; switching to degraded MOCK mode` or similar.
2. Confirm `MOCK_FALLBACK=true` (default) so the server returns deterministic mock instead of 503.
3. **Recovery**:
   - Clear adapter cache if using local/LoRA: remove or re-download the adapter directory.
   - Restart the worker/process (e.g. `uvicorn` or `python -m medgemma_core.server`).
   - Ensure `MEDGEMMA_MODEL` (or `HF_MODEL` / Vertex) and credentials are set and reachable.
4. To **disable** mock fallback and always return 503 when model is unavailable: set `MOCK_FALLBACK=false` and restart.

## Switching to production adapter

1. Set `ADAPTER_PATH` or `LORA_ADAPTER_PATH` to the production adapter path (local, `gs://`, or URL).
2. Restart the inference service so it picks up the new path.
3. Verify with a test inference and check `data/audit.log` for correct `adapter_id` in events.

## Revoking mock fallback

- Set **`MOCK_FALLBACK=false`** in the environment (or in config).
- Restart the server.
- When the model is unavailable, the API will return **503** with code `MODEL_LOAD_FAIL` instead of mock responses.

## Rotating keys and secrets

- **API key**: Update `API_KEY` (or equivalent) and restart; clients must use the new key.
- **Hugging Face / Vertex**: Rotate tokens in the secret manager; set `HF_API_KEY`, Vertex credentials, etc.; restart workers.
- **Logging to cloud**: Set Stackdriver/CloudWatch (or equivalent) to ship logs from stdout; ensure no PII in log payloads.

## Retries and circuit breaker

- **Retries**: Transient failures (model load, HF/Vertex calls) use exponential backoff (max 5 attempts, base 0.5s, max 8s). Configure via `RETRY_MAX`, `RETRY_BASE`.
- **Circuit breaker**: After 5 errors in the configured window (default 60s), adapter/external calls are not attempted for the cooldown period (default 30s). Configure via `CB_ERRORS`, `CB_WINDOW`, `CB_COOLDOWN`.
- When the circuit is open, the system falls back to cached or mock behavior; check logs for circuit state.

## Quick reference

| Env / config      | Purpose |
|-------------------|--------|
| `MOCK_FALLBACK`   | If true (default), return mock when model unavailable; if false, return 503. |
| `AUDIT_LOG_PATH`  | Path to inference audit JSONL file (default `data/audit.log`). |
| `LOG_LEVEL`       | Logging level (e.g. DEBUG, INFO). |
| `RETRY_MAX`       | Max retry attempts for transient failures. |
| `CB_ERRORS` / `CB_WINDOW` / `CB_COOLDOWN` | Circuit breaker parameters. |

See also: [docs/error_handling.md](docs/error_handling.md), [replit/README.md](replit/README.md).
