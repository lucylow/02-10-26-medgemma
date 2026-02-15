# Records of Processing Activities (ROPA)

**Document Version:** 1.0  
**Last Updated:** 2026-02-14  
**Controller:** Cognita Health (placeholder)

---

## 1. Controller & Processor Roles

| Role | Entity | Description |
|------|--------|-------------|
| **Controller** | Cognita Health | Determines purposes and means of processing; responsible for lawful basis and data subject rights |
| **Processor** | Cloud providers (GCP Vertex AI, Supabase, etc.) | Processes data on behalf of controller under DPA |
| **Sub-processor** | Google (Vertex AI, MedGemma) | Model inference; data processed per BAA/DPA |

---

## 2. Data Categories

| Category | Description | PHI/ePHI | Examples |
|----------|-------------|----------|----------|
| **PHI/ePHI** | Direct identifiers, images, identifiable observations | Yes | Child age (if linked to name), raw images, parent names |
| **Pseudonymized IDs** | One-way hashed identifiers | No (if properly pseudonymized) | user_pseudonym, case_id, screening_id |
| **Embeddings** | Vector representations of visual data | Debatable | embedding_b64 (derived from images) |
| **Clinical outputs** | AI-generated summaries, risk assessments | Yes (if linked to patient) | clinical_summary, riskLevel, recommendations |
| **Audit logs** | Access and inference events | Minimal (hashed refs) | event_id, actor_id, resource_id, outcome |

---

## 3. Purposes of Processing

| Purpose | Description | Legal Basis (GDPR) | Consent Required |
|---------|-------------|-------------------|------------------|
| **Screening** | Developmental screening via MedGemma inference | Consent; Legitimate interest (health) | Yes (parental) |
| **Model inference** | Run AI model on embeddings/observations | Consent | Yes |
| **Raw image storage** | Store raw images for clinician review | Explicit consent | Yes (explicit) |
| **Analytics (aggregate)** | Aggregate, de-identified metrics | Legitimate interest | No (if truly de-identified) |
| **Audit & compliance** | Immutable audit trails | Legal obligation | No |

---

## 4. Data Recipients

| Recipient | Data Received | Purpose |
|-----------|---------------|---------|
| Clinicians | Screening reports, risk assessments | Clinical review and sign-off |
| Cloud (Vertex AI) | Embeddings, observations (no raw images by default) | MedGemma inference |
| Hilti / CHWs | Pseudonymized screening data | Care coordination |
| Legal/Regulatory | Audit logs, ROPA | Compliance, breach notification |

---

## 5. International Transfers

| Transfer | Mechanism | Notes |
|---------|------------|-------|
| US ↔ EU | SCCs (Standard Contractual Clauses) | If using GCP/EU regions |
| Sub-processors | DPA + SCCs | Per BAA/DPA checklists |

---

## 6. Retention Periods

| Data Type | Retention | Policy Reference |
|-----------|-----------|------------------|
| Raw images (consented) | 30 days default | compliance/retention_policy.md |
| Embeddings | 5 years (configurable), pseudonymized | retention_policy.md |
| Audit logs | 7 years (immutable) | retention_policy.md |
| Finalized clinical reports | 7–10 years per local regulations | retention_policy.md |
| Draft reports | Per RETENTION_DAYS (default 365) | retention.py |

---

## 7. Security Measures

- **Encryption in transit:** TLS 1.2+
- **Encryption at rest:** KMS envelope encryption (see compliance/encryption.md)
- **Access control:** RBAC (admin, clinician, chworker, researcher, system)
- **Pseudonymization:** User identifiers hashed with server-side pepper
- **Audit logging:** Append-only, HMAC-chained for tamper evidence

---

## 8. Data Subject Rights

| Right | Endpoint | Status |
|-------|----------|--------|
| Access / Portability | GET /api/dsr/export | Implemented |
| Erasure (Right to be Forgotten) | POST /api/dsr/erase | Implemented |
| Rectification | POST /api/dsr/rectify | Implemented |

---

## 9. Data Flow Summary

See `compliance/data_flow.mmd` and `compliance/data_flow.png` for visual diagram.

**Flow:** Capture (client) → On-device embedding (MedSigLIP) → API (embedding_b64) → MedGemma inference → Results storage → Clinician portal

Raw images only flow when explicit consent is recorded and consent_id is validated.
