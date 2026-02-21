# Software Architecture Specification

**Product:** PediScreen AI  
**Version:** v1.0  
**Date:** Feb 2026  
**Alignment:** FDA SaMD, IEC 62304 (as applicable)

---

## 1. System Context

- **Users:** Clinicians, CHWs, care coordinators.
- **Intended use:** AI-assisted developmental screening; output is decision support only. Clinician review and sign-off are mandatory.
- **Deployment:** On-premises or cloud (e.g. hospital VPC); PHI in isolated subnet.

---

## 2. High-Level Architecture

```
[ Edge / CHW App ] → [ API Gateway ]
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                  ▼
[ PHI Service ]   [ AI Inference ]   [ Telemetry ]
(isolated VPC)    (no PHI)           (anonymized only)
```

- **PHI Service:** Tokenized patient identity store; encryption at rest; access audit log. Only UUID token crosses to other services.
- **AI Inference Service:** Receives only tokenized IDs and de-identified observations; no PHI in inputs or logs.
- **Telemetry Service:** Metrics, drift (PSI), bias, latency, cost; no PHI.

---

## 3. Key Components

| Component | Responsibility |
|-----------|----------------|
| PHI Guard Middleware | Validates that AI/telemetry payloads contain no PHI keys; blocks request if PHI detected. |
| PHI Store / Encryption | Envelope encryption of PHI; token (UUID) returned to callers. |
| Inference Pipeline | MedGemma/MedSigLIP-based risk assessment; confidence thresholds; fallback to baseline. |
| FHIR Adapter | Attaches AI metadata (model, confidence, PSI drift, drift_level) to FHIR Observations for EHR. |
| Drift & Bias Monitoring | PSI on embeddings and predictions; fairness metrics; Grafana dashboards and alerts. |
| Audit Log | Request/response hashes, user, model, timestamp; no raw PHI. |

---

## 4. Security and Privacy

- PHI never enters AI or telemetry paths (enforced by schema and middleware).
- Encryption: PHI at rest with key from secure env or KMS; TLS in transit.
- Access control and audit trail for PHI access (phi_access_log).
- VPC segmentation: PHI DB in private subnet; AI in isolated compute; telemetry in analytics subnet.

---

## 5. Traceability

- Software version and build traceable to source (e.g. git tag, build ID).
- Configuration (thresholds, model version) documented and change-controlled.
- FHIR extensions carry model name and drift metadata for downstream audit.
