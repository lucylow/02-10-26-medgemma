# Encryption at Rest & In Transit

**Document Version:** 1.0  
**Last Updated:** 2026-02-14

---

## 1. In Transit

- **TLS 1.2+** for all API traffic
- Enforced at load balancer / reverse proxy (e.g. Cloud Run, nginx)

---

## 2. At Rest — KMS Envelope Encryption

PHI columns (raw_images, embeddings, observations) should be encrypted using envelope encryption:

1. **Data Encryption Key (DEK):** Generated per-record or per-tenant
2. **Key Encryption Key (KEK):** Stored in KMS (GCP KMS, AWS KMS, or mock in dev)
3. **Ciphertext:** DEK-encrypted data + KMS-encrypted DEK

### Dev Mock

For local development, use `compliance/tests/test_encryption.py` mock KMS (cryptography library).

### Production (GCP KMS)

```python
from google.cloud import kms_v1
import base64

def encrypt_with_kms(plaintext: bytes, kms_key_name: str) -> str:
    client = kms_v1.KeyManagementServiceClient()
    response = client.encrypt(request={"name": kms_key_name, "plaintext": plaintext})
    return base64.b64encode(response.ciphertext).decode("ascii")

def decrypt_with_kms(cipher_b64: str, kms_key_name: str) -> bytes:
    client = kms_v1.KeyManagementServiceClient()
    ciphertext = base64.b64decode(cipher_b64)
    resp = client.decrypt(request={"name": kms_key_name, "ciphertext": ciphertext})
    return resp.plaintext
```

---

## 3. Key Rotation Policy

- **KEK rotation:** Annual or on compromise; re-encrypt DEKs with new KEK
- **DEK rotation:** Per-record on access (lazy) or batch job
- **Secrets:** Stored in GCP Secret Manager / AWS Secrets Manager / Vault

---

## 4. Configuration

| Env Var | Description |
|---------|-------------|
| `KMS_KEY_NAME` | Full KMS key resource name (prod) |
| `PSEUDONYM_PEPPER` | Server-side pepper for pseudonymization |
| `SERVER_PRIVATE_KEY_B64` | Curve25519 private key for client-side encrypted embeddings |
