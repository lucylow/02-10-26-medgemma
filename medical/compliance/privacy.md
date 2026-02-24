## Privacy & HIPAA Alignment

This document summarizes how PediScreen AI is designed to align with **HIPAA**, **GDPR**, and common enterprise security expectations while remaining practical for pilots and research deployments.

### 1. Data Types and PHI Handling

- **Primary inputs**: Developmental observations, age in months, optional embeddings from on-device models (e.g., MedSigLIP), and optional non-identifying metadata.
- **Avoided where possible**: Names, exact dates of birth, MRNs, contact details, and free-text narrative that includes directly identifying information.
- **PHI detection**: The backend includes PHI heuristics (see `docs/legal_compliance.md` and `backend/app/services/phi_redactor.py`) and can refuse to send suspected PHI to external model providers.

### 2. Embedding-First Architecture

- Client devices compute visual or audio embeddings locally.
- Only normalized embeddings and structured text are sent to the backend.
- Embeddings can optionally be encrypted with the backend’s public key for transit and at-rest protection.

### 3. Storage and Access Control

- **Auth**: Supabase authentication or equivalent OIDC provider for clinicians and CHWs.
- **RBAC**: Role-based access patterns tied to clinician, CHW, and admin personas; parents do not access raw model outputs directly without clinician mediation.
- **Retention**: Screening drafts and logs are retained according to configurable retention policies; demo environments use short retention and synthetic data only.

### 4. Third-Party Services

Where third-party services are used (e.g., model APIs, logging, monitoring), the deployment operator is responsible for:

- Ensuring a **Business Associate Agreement (BAA)** or equivalent data protection agreement is in place where PHI may be processed.
- Configuring endpoints, regions, and data residency to align with local regulations.

### 5. Auditability

Every screening can be traced via:

- `case_id` and `inference_id`
- Model and adapter identifiers
- Prompt and input hashes
- Clinician sign-off state and overrides

These audit trails support regulatory inquiries and internal quality review.

