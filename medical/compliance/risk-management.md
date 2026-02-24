## Risk Management (ISO 14971-Inspired Overview)

This document provides a lightweight, implementation-focused view of PediScreen AI’s risk management approach, inspired by **ISO 14971** for medical device risk management.

### 1. Intended Use and Residual Risk

- **Intended use**: Clinical decision support for pediatric developmental screening; generates draft summaries and risk flags for clinician review.
- **Users**: Trained clinicians and Community Health Workers operating under clinical supervision.
- **Residual risk**: Even with mitigations, the system can mis-rank or mis-summarize risk. Human review and clear disclaimers are mandatory.

### 2. Representative Hazards and Controls

| Hazard | Example Harm | Control (Design / Process) |
|--------|--------------|----------------------------|
| Over-reliance on AI | Clinician accepts high-risk flag without verification | Mandatory clinician sign-off, CDS disclaimer UI, training materials |
| Underestimation of risk | High-risk child flagged as low | Conservative calibration, low-confidence → “requires clinician review” state |
| Biased performance | Worse performance for specific demographics | Diverse validation datasets, bias dashboards, periodic re-evaluation |
| Data breach | Unauthorized access to screening history | AuthN/Z, encryption in transit and at rest, minimized PHI handling |
| Misconfigured model | Wrong adapter or prompt version | Config validation, provenance fields, canary environments |

### 3. Safety Mechanisms in Code

Key technical controls include:

- **Safety gates and validation** in `backend/app/services/safe_inference.py`
- **Audit logging and telemetry** in `backend/app/services/audit.py` and related modules
- **Human-in-the-loop enforcement** via clinician sign-off flows (`src/components/pediscreen/ClinicianSignOff.tsx`, `docs/hitl_architecture.md`)
- **Fallback behavior** when the model fails or returns invalid JSON: risk escalated to manual review

### 4. Lifecycle and Change Management

- Configuration and model changes should be tracked via version control and deployment pipelines.
- Model updates require:
  - Documented validation runs
  - Updated `model/README.md` with new adapter/version IDs
  - Review of risk controls if behavior or intended use changes

This file is a **starting point** for a fuller ISO 14971 risk management file set and can be extended with formal hazard logs, FMEAs, and clinical validation reports in production deployments.

