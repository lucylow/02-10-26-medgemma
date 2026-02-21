# Risk Management Plan

**Product:** PediScreen AI  
**Version:** v1.0  
**Date:** Feb 2026  
**Alignment:** FDA 21 CFR Part 820, ISO 14971

---

## 1. Scope

This plan covers risk management for PediScreen AI as Software as a Medical Device (SaMD), Class II developmental screening decision support. It applies across design, development, deployment, and post-market surveillance.

---

## 2. Hazard Identification

| Hazard | Description | Cause |
|--------|-------------|--------|
| **False negative** | Missed developmental risk → delayed intervention | Model under-call, threshold too high, data drift |
| **False positive** | Unnecessary referral burden, caregiver anxiety | Model over-call, threshold too low, bias |
| **Model drift** | Degraded performance over time | Distribution shift, population change, embedding drift |
| **Bias / inequity** | Worse performance for subgroups | Training data imbalance, demographic confounders |
| **Reliance without review** | Clinician defers to AI without verification | UX, workflow, over-trust |
| **PHI exposure** | Unauthorized access or leakage | Misconfiguration, missing PHI isolation |

---

## 3. Risk Controls

- **Confidence thresholds:** Configurable minimum confidence for AI output; below threshold → flag for human review or baseline-only.
- **Clinician sign-off mandatory:** All screening outcomes require clinician review before finalizing; AI is decision support only.
- **PSI drift monitoring:** Embedding and prediction drift (PSI) tracked in Grafana; alerts at configurable thresholds (e.g. PSI > 0.1 moderate, > 0.25 high).
- **Bias monitoring dashboard:** Demographic parity, equalized odds, FPR/FNR by subgroup; reviewed in regulatory/quality cycles.
- **PHI isolation:** PHI never enters AI or telemetry pipelines; tokenized identity only; encryption and access logging per HIPAA.
- **Audit trail:** Full audit log (request, model, hashed input/output, user) for traceability and post-market analysis.

---

## 4. Residual Risk Assessment

All identified residual risks are documented and evaluated. Those that remain after controls are deemed **acceptable** under the intended use (supervised clinical workflow, screening aid only, not diagnostic). Risk-benefit is positive for the target population when used as intended.

---

## 5. Review and Updates

Risk management file is reviewed at least annually and after any significant change (model update, new population, new integration). Updates are version-controlled and traceable to design and post-market data.
