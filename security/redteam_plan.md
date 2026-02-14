# Red Team Penetration Testing Plan

## Scope

- Authentication bypass attempts
- Privilege escalation attempts
- Audit log tampering and detection verification
- PHI exfiltration from logs or storage

## Test Checklist

| Test | Expected Result |
|------|-----------------|
| Access /infer without token | 401 or 403 |
| Access /admin/update_adapter as chworker | 403 |
| Modify audit log entry, run verify_audit_chain | FAIL (chain broken) |
| Search logs for raw PHI substrings | None found |
| JWT with invalid signature | 401 |

## Schedule

- Quarterly pen-test run
- Remediation within 30 days for critical findings

## Dry Run

Run `scripts/verify_audit_chain.py` after manually modifying a fixture to confirm tamper detection.
