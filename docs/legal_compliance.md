# Legal & Regulatory Strategy

For PediScreen AI, proactively addressing legal issues is a strategic priority to ensure a responsible and feasible approach to healthcare AI. This document outlines our compliance framework across five critical areas.

## 🏛️ 1. Regulatory Strategy: Clinical Decision Support (CDS)

PediScreen AI is explicitly designed as **Clinical Decision Support (CDS) software** for use by healthcare professionals (HCPs) and Community Health Workers (CHWs), rather than a tool for autonomous diagnosis by parents.

### Positioning for Enforcement Discretion
Our goal is to fall under **FDA enforcement discretion**, avoiding the "medical device" classification by meeting the following criteria:

| Feature | Implementation in PediScreen AI |
| :--- | :--- |
| **Human-in-the-Loop** | AI generates draft summaries; licensed clinicians remain the sole authority for all clinical decisions. |
| **Explainable Outputs** | The interface highlights specific data and reasoning (e.g., "vocabulary below typical range") allowing independent review. |
| **Non-Diagnostic Framing** | The system avoids terms like "diagnosis" and uses clear disclaimers stating it is an aid for professionals. |

---

## ⚖️ 2. Liability & Risk Management

To manage liability, PediScreen AI emphasizes transparency and human agency.

*   **Intended User**: Clearly defined as trained CHWs or clinicians. The tool informs, but does not replace, their judgment.
*   **Auditability**: The system maintains immutable logs of all inputs, AI outputs, and human edits/approvals (see `docs/hitl_architecture.md`).
*   **Guardrails**: Technical gates (State Machine enforcement) prevent the delivery of results without human sign-off.

---

## 🔒 3. Data Privacy & Security (HIPAA/GDPR)

Handling pediatric health data requires the highest level of security.

*   **Data Minimization**: We use synthetic or anonymized data for demos and collect only necessary screening metrics.
*   **On-Device Processing**: Our architecture supports on-device inference using MedGemma, ensuring sensitive data remains on the user's device.
*   **Security by Design**: Implementation of role-based access control (RBAC) and end-to-end encryption for any server-side components.

---

## ⚖️ 4. Algorithmic Bias & Fairness

AI models must be fair and equitable, especially in pediatrics.

*   **Diverse Validation**: We acknowledge the risk of bias and prioritize validation across diverse ethnicities and socioeconomic groups.
*   **Bias Auditing**: Our roadmap includes ongoing bias testing using standardized frameworks to detect performance disparities.
*   **MedGemma Foundation**: By using MedGemma, trained on broad biomedical data, we start with a more representative foundation than niche, small-scale models.

---

## 👧 5. Pediatric-Specific Protections

Children are a vulnerable population requiring special "design for safety."

*   **Children & AI Design Code**: We use this framework as a guiding principle, prioritizing children's rights and safety by default.
*   **Parental Consent**: Robust consent mechanisms are integrated into the workflow before any data collection.
*   **Age-Appropriate Design**: Interfaces are designed to help CHWs communicate results to families in a supportive, clear manner.

---

## ✅ Compliance Checklist

| Legal Area | Status | Evidence |
| :--- | :--- | :--- |
| **Regulatory** | ✅ | CDS architecture, human-in-the-loop enforcement, and prominent disclaimers. |
| **Liability** | ✅ | Human sign-off required for all results; immutable audit trails. |
| **Privacy** | ✅ | Support for on-device inference and commitment to data minimization. |
| **Bias** | ✅ | Documented plan for continuous bias auditing and diverse validation. |
| **Pediatric** | ✅ | Adherence to Children & AI Design Code principles. |
