# Data Security Plan — PediScreen AI Research

## Scope

This plan covers protection of research data (including PHI) collected or processed in studies using PediScreen AI.

## Data Classification

- **PHI/ePHI:** Identifiable health information; subject to HIPAA and IRB requirements.
- **De-identified:** Data stripped of identifiers per HIPAA Safe Harbor or expert determination; used for analysis and model improvement where approved.

## Technical Safeguards

- **Encryption in transit:** TLS 1.2+ for all API and EHR integrations (SMART-on-FHIR).
- **Encryption at rest:** AES-256 (KMS envelope encryption) for stored PHI; encrypted DB and object storage.
- **Access control:** Role-based access; authentication via JWT/OAuth; minimal privilege; audit logging of access.
- **Integrity:** Audit logs protected from tampering; change control for software (see regulatory/change_control_procedure.md).

## Administrative Safeguards

- **Policies:** HIPAA Security Rule alignment; NIST 800-53 control implementation (see compliance/nist_800-53_matrix.md).
- **Training:** Personnel with PHI access complete HIPAA and human subjects training.
- **Incident response:** Sentry and escalation playbook; breach notification per HIPAA and IRB requirements.

## Physical Safeguards

- **Hosting:** Cloud or on-prem environments with physical and logical access controls; no PHI on unencrypted portable media.

## Retention and Disposal

- Retention per protocol and institutional policy.
- Secure deletion or de-identification at end of retention; disposal per NIST/IRB standards.

## Evidence

- Compliance evidence: `compliance/generate_evidence_report.py` → `compliance/evidence_report.json`.
- Control implementations: `compliance/control_implementations/`.
