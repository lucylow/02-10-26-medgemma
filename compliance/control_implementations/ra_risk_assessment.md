# RA — Risk Assessment (NIST 800-53 Rev.5)

## RA-5 Vulnerability Scanning

- **Implementation:** GitHub Actions (or equivalent CI) for container image scanning (e.g. Trivy); dependency scanning; regular baseline scans of deployment targets.
- **Artifacts:** CI workflows; Trivy config; dependency audit in build pipeline.

## RA-3 Risk Assessment

- **Implementation:** Risk management and clinical evaluation plans; cybersecurity plan; post-market surveillance; risk-benefit analysis in IRB packet.
- **Artifacts:** `regulatory/risk_management_plan.md`, `regulatory/clinical_evaluation_plan.md`, `regulatory/cybersecurity_plan.md`, `regulatory/post_market_surveillance.md`, `irb/risk_benefit_analysis.md`.

## RA-2 Security Categorization

- **Implementation:** System categorized for HIPAA (ePHI); FISMA moderate equivalent for federal context; documentation in compliance matrix and regulatory docs.
- **Artifacts:** This compliance matrix; regulatory/software_architecture_spec.md.
