# Cybersecurity Plan

**Product:** PediScreen AI  
**Version:** v1.0  
**Date:** Feb 2026  
**Alignment:** FDA Cybersecurity Guidance, HIPAA, and industry best practices.

---

## 1. Scope

Cybersecurity controls for PediScreen AI infrastructure, applications, and data (including PHI and model assets) across development, deployment, and operations.

---

## 2. Threat Model (Summary)

- **Insider access:** Least privilege; role-based access; audit of PHI and config changes.
- **External compromise:** Network segmentation; no PHI in AI/telemetry; encryption at rest and in transit.
- **Supply chain:** Dependency scanning; signed builds; approved base images.
- **Ransomware / integrity:** Backups; integrity checks; immutable audit logs where feasible.

---

## 3. Controls

### 3.1 Access Control

- Principle of least privilege for DB, APIs, and telemetry.
- Strong authentication (e.g. SSO, MFA) for production access.
- PHI access logged in phi_access_log; regular review.

### 3.2 Data Protection

- PHI encrypted at rest (envelope encryption; key from env or KMS).
- TLS for all API and inter-service communication.
- No PHI in AI inference or telemetry payloads (enforced by PHI Guard).

### 3.3 Network and Deployment

- PHI store in private subnet; AI and telemetry in separate segments.
- Firewall and WAF rules; no unnecessary exposure of internal services.
- Container/images from trusted registry; vulnerability scanning in CI.

### 3.4 Monitoring and Response

- Security-relevant events (auth failures, PHI access, config change) logged and alertable.
- Incident response plan; roles and escalation defined.
- Post-incident review and update of this plan.

---

## 4. Maintenance

- Dependencies and base images updated on a defined schedule; critical CVEs patched urgently.
- Plan reviewed at least annually and after significant incidents or architecture changes.
