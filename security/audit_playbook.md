# Audit Playbook

Steps for retrieving logs, verifying chain integrity, and preparing exports for regulators.

## 1. Retrieve Audit Logs

- **In-memory (dev)**: Use `GET /admin/audit/search` with filters.
- **Production**: Query `audit_log` table or export from append-only object storage.
- **Retention**: 7 years (configurable per jurisdiction).

## 2. Verify Chain Integrity

```bash
# Using fixture
python scripts/verify_audit_chain.py --fixtures compliance/fixtures/audit_sample.json

# Using live store (when app running)
python scripts/verify_audit_chain.py
```

Expected output: `OK: Chain verified (N entries)`

## 3. Generate Redacted Export

- Never include raw PHI (observations, images).
- Include: event_id, event_type, actor_id, actor_role, timestamp, request hashes, response hashes, outcome.
- Use `input_hash` and `prompt_hash` for reproducibility; never raw text.

## 4. Share with Regulators

- Provide chain verification output.
- Explain provenance fields: adapter_id, model_id, prompt_hash, input_hash.
- Document HMAC chaining and anchoring (if implemented).

## 5. Incident Response

See [runbooks/how_to_handle_breach.md](./runbooks/how_to_handle_breach.md).
