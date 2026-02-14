# Security Notes: Key Management & Production Hardening

## Private Key Retrieval

**Do not** store private keys in repo or config files. Use environment or secret manager references.

### Recommended: KMS / Secret Manager

- **AWS KMS:** Use `SERVER_PRIVATE_KEY_B64` populated from Secrets Manager or Parameter Store. At startup, fetch via `boto3.client('secretsmanager').get_secret_value()`.
- **GCP Secret Manager:** Use `google-cloud-secret-manager` to fetch `SERVER_PRIVATE_KEY_B64` at runtime.
- **HashiCorp Vault:** Use Vault KV engine; inject key via init container or sidecar that writes to env/file consumed by the app.

### Local Development Fallback

For local testing without KMS:
```bash
# Generate keypair: python app/backend/gen_keypair.py
export SERVER_PRIVATE_KEY_B64="<base64-of-private-key>"
```
Never commit this value. Use `.env` (gitignored) for local dev.

## Embeddings-Only Default

- Set `DEFAULT_UPLOAD_MODE=embeddings_only` in production.
- If raw images are received, require `consent_id` and log in audit trail.
- Server-side checks: validate consent structure before processing.

## Rate Limiting

- Apply rate limits to sensitive endpoints (e.g. `/api/embed`, `/api/infer`).
- Use middleware (e.g. slowapi, nginx limit_req) to prevent abuse.
