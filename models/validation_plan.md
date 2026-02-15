# Model Validation Plan

**Document Version:** 1.0  
**Last Updated:** 2026-02-14

---

## 1. Retrospective Validation

- **Dataset:** Held-out validation set (benchmark.json, bias_audit.json)
- **Sample size:** Minimum 500 cases per domain
- **Endpoints:** Sensitivity, specificity, PPV, NPV by risk level
- **Thresholds:** Sensitivity ≥ 0.85 for refer; specificity ≥ 0.80

---

## 2. Prospective Validation

- **Design:** Multi-site pilot
- **Cases:** 1,000+ with gold-standard clinician assessment
- **Inclusion:** Ages 0–72 months, screening-appropriate
- **Exclusion:** Missing consent, incomplete data

---

## 3. Clinician Review Plan

- All AI outputs require clinician sign-off before clinical use
- Low-confidence inferences flagged for mandatory review
- Feedback loop: clinician overrides recorded for model improvement
