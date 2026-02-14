# Sample Audit Report for Regulators

## Chain Verification

```
$ python scripts/verify_audit_chain.py --fixtures compliance/fixtures/audit_sample.json
OK: Chain verified (1 entries)
```

## Provenance Fields

| Field | Description | Example |
|-------|-------------|---------|
| adapter_id | LoRA adapter identifier | pediscreen_v1 |
| model_id | Base model | google/medgemma-2b-it |
| prompt_hash | SHA256 of prompt (no PHI) | e3b0c44... |
| input_hash | SHA256 of input metadata | a1b2c3d... |
| inference_ts | Timestamp of inference | 2026-02-14T10:00:00Z |
| actor_id | User/service ID | clinician-demo-1 |
| actor_role | Role at time of action | clinician |

## Example Redacted Export

See [runbooks/how_to_export_redacted_logs.md](./runbooks/how_to_export_redacted_logs.md) for schema.

## Integrity Justification

- Each audit entry includes HMAC over (prev_hmac + entry content).
- Tampering any entry breaks the chain; verification script detects it.
- Optional: daily Merkle root anchored to external witness.
