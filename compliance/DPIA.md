# Data Protection Impact Assessment (DPIA) — Template

**Document Version:** 1.0  
**Last Updated:** 2026-02-14

*Complete and submit for legal/DPO review.*

---

## 1. Purpose & Necessity

- **Processing:** Developmental screening via AI (MedGemma)
- **Purpose:** Assist clinicians and CHWs in early identification of developmental delays
- **Necessity:** Core service; cannot be achieved without processing health data

---

## 2. Data Flows & Risks

| Flow | Data | Risk |
|------|------|------|
| Client → API | Embeddings, observations | Unauthorized access, interception |
| API → Vertex AI | Embeddings, observations | Subprocessor access |
| Storage | PHI in DB | Breach, misuse |
| Audit logs | Event metadata | Re-identification if logs exposed |

---

## 3. Mitigations

| Risk | Technical | Organisational |
|------|-----------|----------------|
| Unauthorized access | TLS, RBAC, API keys | Access policies, training |
| Breach | KMS encryption, pseudonymization | Incident response, BAA/DPA |
| Re-identification | Minimize PHI, hash identifiers | Retention policy, DSR |

---

## 4. Residual Risk & Decision

- **Residual risk:** [Low/Medium/High — to be assessed]
- **Decision:** [Proceed / Proceed with conditions / Not proceed]
- **Approval:** [DPO/Legal sign-off]
