# PL — Planning (NIST 800-53 Rev.5)

## PL-1 Policy and Procedures

- **Implementation:** Security and privacy policies documented; change control procedure; software architecture spec; clinical evaluation and risk management plans.
- **Artifacts:** `regulatory/change_control_procedure.md`, `regulatory/software_architecture_spec.md`, `regulatory/risk_management_plan.md`, `regulatory/clinical_evaluation_plan.md`, `regulatory/cybersecurity_plan.md`.

## PL-2 System Security Plan

- **Implementation:** Architecture and deployment documented; NIST control mapping (this matrix); IRB data security plan; incident handling (Sentry, playbook).
- **Artifacts:** `compliance/nist_800-53_matrix.md`, `irb/data_security_plan.md`, error handling and escalation procedures.

## PL-8 Security and Privacy Architectures

- **Implementation:** Separation of PHI from AI/telemetry paths; encryption in transit and at rest; SMART-on-FHIR for EHR boundary; least-privilege API and K8s design.
- **Artifacts:** PHI guard middleware, encryption services, FHIR/EHR integration design, K8s manifests and Helm values.
