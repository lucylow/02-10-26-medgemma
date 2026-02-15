# Secrets Management Policy

**Document Version:** 1.0  
**Last Updated:** 2026-02-14

---

## 1. Storage

- **Production:** GCP Secret Manager / AWS Secrets Manager / Hashicorp Vault
- **Never:** Commit secrets to git; use `.env.example` with placeholders only

---

## 2. Rotation

- API keys: 90 days or on compromise
- KMS keys: Annual
- Database credentials: Per policy

---

## 3. Access

- Principle of least privilege
- Audit all secret access
- Use workload identity where possible

---

## 4. Pre-commit

- `detect-secrets` or similar to prevent accidental commits
- CI: fail on high-confidence secret detection
