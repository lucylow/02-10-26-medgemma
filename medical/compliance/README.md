## PediScreen AI Compliance Overview

This folder documents how PediScreen AI is operated as a **Class I Software as a Medical Device (SaMD)** screening support tool, aligned with FDA, HIPAA, and enterprise security expectations.

- **Intended use**: Pediatric developmental screening decision support for ages 0–5 years. Outputs are draft summaries and risk flags for licensed clinicians to review, edit, and sign off.
- **Clinical role**: Decision support only. PediScreen AI never replaces a clinician’s judgment and is not a diagnostic device.
- **Data model**: Embedding-first. Raw images are processed on device or edge; only text, metadata, and optional embeddings are sent to the backend.

### Key References in This Repo

- Technical architecture and model lineage: `README.md` and `model/README.md`
- API contracts and error codes: `docs/api.md` and `docs/API_ERROR_CODES.md`
- Legal and regulatory notes: `docs/legal_compliance.md`
- Data acquisition and consent: `docs/data_acquisition_checklist.md`, `docs/parent_faq.md`

### Compliance Artifacts

- `privacy.md` — HIPAA alignment, PHI handling, and data flows
- `risk-management.md` — ISO 14971-style hazard and risk controls overview

These files are designed to be **audit-ready entry points** that link to deeper technical and legal documentation elsewhere in the repository.

