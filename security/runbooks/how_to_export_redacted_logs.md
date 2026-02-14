# How to Export Redacted Logs

## Rules

1. **Never export raw PHI**: observations, images, clinical summaries as plain text.
2. **Include hashes**: input_hash, prompt_hash, summary_hash for reproducibility.
3. **Include metadata**: event_id, timestamp, actor_role, outcome, adapter_id, model_id.

## Steps

1. Request export via `POST /admin/audit/export` (auditor role).
2. Filter by date range, event_type, actor_id as needed.
3. Strip any fields that could contain PHI.
4. Store export in encrypted bucket with limited-time signed URL.
5. Record export in audit log (audit_export_request).

## Example Redacted Record

```json
{
  "event_id": "uuid",
  "event_type": "inference_run",
  "actor_role": "clinician",
  "timestamp": "2026-02-14T10:00:00Z",
  "request": {
    "prompt_hash": "sha256...",
    "input_hash": "sha256...",
    "adapter_id": "pediscreen_v1",
    "model_id": "google/medgemma-2b-it"
  },
  "response": {
    "risk": "monitor",
    "confidence": 0.72
  },
  "outcome": "queued_for_review"
}
```
