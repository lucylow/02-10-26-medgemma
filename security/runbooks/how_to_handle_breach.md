# How to Handle a Security Breach

## Immediate Actions

1. **Contain**: Isolate affected systems; revoke compromised credentials.
2. **Assess**: Determine scope (PHI exposed? Audit logs tampered?).
3. **Notify**: Internal security team; legal/compliance per regulatory requirements.

## Audit Log Verification

1. Run `scripts/verify_audit_chain.py` on audit store.
2. If chain breaks, identify first tampered entry.
3. Preserve evidence (logs, hashes) for forensic analysis.

## Credential Rotation

1. Rotate API keys, JWT secrets, KMS keys.
2. Invalidate active sessions.
3. See [key_rotation.md](../key_rotation.md).

## Post-Incident

1. Document timeline and root cause.
2. Update runbooks and controls.
3. Conduct tabletop exercise if needed.
