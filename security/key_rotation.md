# Key Rotation Policy

## Frequency

- **HMAC audit key**: Annually or on compromise.
- **JWT/OIDC secrets**: Per provider policy; rotate on compromise.
- **API keys**: Quarterly; rotate immediately on compromise.

## KMS Usage

- Use KMS for key storage; never store raw keys in config.
- Rotate via KMS key version; maintain backward compatibility during transition.

## Steps to Rotate Audit HMAC Key

1. Generate new key; store in vault.
2. Run dual-write during transition (optional).
3. Update `AUDIT_HMAC_KEY` env; restart services.
4. Old chain remains verifiable with old key; new entries use new key (document split).

## Revocation

- Revoke compromised API keys immediately in vault/config.
- Invalidate JWT refresh tokens if provider supports.
