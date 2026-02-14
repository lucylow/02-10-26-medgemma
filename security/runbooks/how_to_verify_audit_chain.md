# How to Verify Audit Chain

## Prerequisites

- Python 3.10+
- `AUDIT_HMAC_KEY` env var (or use default for dev fixtures)

## Commands

```bash
# From project root
python scripts/verify_audit_chain.py --fixtures compliance/fixtures/audit_sample.json
```

For fixture with placeholder HMACs, the script fills them and verifies.

```bash
# With custom key
AUDIT_HMAC_KEY=your-key python scripts/verify_audit_chain.py --fixtures path/to/audit.json
```

## Expected Output

- `OK: Chain verified (N entries)` — success
- `FAIL: Entry N HMAC mismatch...` — tampering detected
