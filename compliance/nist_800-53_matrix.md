# NIST SP 800-53 Rev.5 Compliance Matrix — PediScreen AI

**Scope:** PediScreen AI (MedGemma) — Healthcare + AI context  
**Baseline:** NIST SP 800-53 Rev.5 Moderate (aligned with HIPAA Security Rule)  
**Last updated:** Generated for enterprise + federal + clinical research deployment.

| Control ID | Control Name | Implementation in PediScreen AI | Status |
|------------|--------------|----------------------------------|--------|
| **AC-2** | Account Management | RBAC via JWT + Postgres RLS; Supabase/Google OAuth; clinician email domain validation | Implemented |
| **AC-3** | Access Enforcement | Role-based middleware + API guards; PHI guard middleware; consent/DSR gates | Implemented |
| **AC-6** | Least Privilege | Scoped SMART scopes (patient/*.read, Observation.write); minimal service accounts in K8s | Implemented |
| **AC-7** | Unsuccessful Logon Attempts | Auth provider (Supabase/Google) lockout; API key rate limiting | Implemented |
| **AC-17** | Remote Access | TLS-only APIs; SMART OAuth; no PHI in logs | Implemented |
| **AU-2** | Event Logging | AI telemetry + audit tables; request_id; correlation IDs for Epic | Implemented |
| **AU-3** | Content of Audit Records | Audit events: who, what, when, resource; no PHI in audit payloads | Implemented |
| **AU-6** | Audit Review | Grafana + Prometheus alerting; drift/bias dashboards; Sentry | Implemented |
| **AU-9** | Protection of Audit Information | Audit log integrity; restricted access to audit tables | Implemented |
| **SC-8** | Transmission Confidentiality/Integrity | TLS 1.2+; HTTPS only; mTLS option (deploy/nginx-mtls) | Implemented |
| **SC-12** | Cryptographic Key Establishment | KMS envelope encryption (phi_encryption); key rotation support | Implemented |
| **SC-28** | Protection of Information at Rest | AES-256 via KMS; PHI encryption at rest; encrypted volumes in K8s | Implemented |
| **SI-4** | System Monitoring | PSI drift + anomaly alerts; fairness metrics; observability/otel | Implemented |
| **RA-5** | Vulnerability Scanning | GitHub Actions + Trivy container scan; dependency scanning | Implemented |
| **CM-2** | Baseline Configuration | Docker + IaC manifests (k8s/, charts); change control (regulatory/) | Implemented |
| **CM-7** | Least Functionality | Minimal containers; no unnecessary services; read-only root where possible | Implemented |
| **IR-4** | Incident Handling | Sentry + escalation playbook; error taxonomy (ErrorCodes) | Implemented |
| **PL-1** | Policy and Procedures | Regulatory docs (risk management, cybersecurity, clinical evaluation) | Implemented |
| **SA-3** | Development Life Cycle | Model-dev pipeline; radiology processor; eval metrics; post-market surveillance | Implemented |
| **SA-11** | Developer Security Testing | Tests (pytest, Cypress); SMART launch flow tests; validation pipelines | Implemented |

## Control Implementation Details

- **AC (Access Control):** See `control_implementations/ac_access_control.md`
- **AU (Audit):** See `control_implementations/au_audit.md`
- **SC (System & Communications):** See `control_implementations/sc_system_communications.md`
- **SI (System Integrity):** See `control_implementations/si_system_integrity.md`
- **RA (Risk Assessment):** See `control_implementations/ra_risk_assessment.md`
- **PL (Planning):** See `control_implementations/pl_planning.md`

## Evidence and Automation

- Automated evidence collection: `compliance/generate_evidence_report.py`
- Output: `compliance/evidence_report.json` (controls verified, drift/bias/FL flags)

## References

- NIST SP 800-53 Rev.5: https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- HIPAA Security Rule: 45 CFR Part 164 Subpart C
- FDA SaMD / IEC 62304 context: see `regulatory/`
