# SC — System and Communications Protection (NIST 800-53 Rev.5)

## SC-8 Transmission Confidentiality and Integrity

- **Implementation:** TLS 1.2+ for all external and internal API traffic; HTTPS only in production; optional mTLS for service-to-service (see `deploy/nginx-mtls/`).
- **Artifacts:** Ingress TLS configuration; nginx.conf and k8s-sidecar-example in deploy/nginx-mtls.

## SC-12 Cryptographic Key Establishment and Management

- **Implementation:** KMS-based envelope encryption for PHI; keys not stored in application code; environment or secret manager for key references.
- **Artifacts:** `backend/app/services/phi_encryption.py`, K8s secrets (e.g. db-secret, encryption keys).

## SC-28 Protection of Information at Rest

- **Implementation:** AES-256 encryption for PHI at rest via KMS; encrypted persistent volumes for stateful workloads (e.g. Postgres); no PHI in plaintext in object storage.
- **Artifacts:** phi_encryption, PHI store schema (`migrations/007_phi_store.sql`), volume encryption in K8s/cloud.
