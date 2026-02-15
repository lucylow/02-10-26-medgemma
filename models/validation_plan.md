# Model Validation Plan

**Document Version:** 1.1  
**Last Updated:** 2026-02-14

---

## 1. Retrospective Validation

- **Dataset:** Held-out validation set (benchmark.json, bias_audit.json)
- **Sample size:** Minimum 500 cases per domain
- **Endpoints:** Sensitivity, specificity, PPV, NPV by risk level
- **Thresholds:** Sensitivity ≥ 0.93 (96% target); specificity ≥ 0.78 (82% target); FNR ≤ 2%

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

---

## 4. FDA CDS Data Requirements

Per FDA guidance for Clinical Decision Support, validation data must satisfy:

| Requirement | Implementation |
|-------------|----------------|
| **Representative of intended use population** | Ages 0–72 months; diverse demographics; include underserved communities |
| **Independent test set (temporal split)** | Hold out 20% by date; no train/test leakage; temporal validation splits |
| **Known limitations documented** | Model Card (MODEL_CARD.md), bias audit (bias_audit.md), documented edge cases |
| **Continuous monitoring plan** | Drift detection, override rate tracking, periodic re-validation |

---

## 5. Phased Validation Strategy

### Phase 1: Internal Validation (Immediate)
- **Data:** CDC Milestones + M-CHAT + synthetic (10K records)
- **Scope:** Retrospective on held-out synthetic + public benchmarks
- **Deliverables:** Sensitivity/specificity by risk level; bias audit report
- **Gate:** Sensitivity ≥ 0.93; specificity ≥ 0.78; FNR ≤ 2% (see `configs/validation_config.yaml`)

### Phase 2: External Validation (1–3 months)
- **Data:** Multi-site clinical partnerships; Taiwan DD collaboration (if available)
- **Scope:** External test set; clinician gold-standard labels
- **Deliverables:** Independent performance report; demographic subgroup analysis
- **Gate:** External sensitivity ≥ 0.80; no significant bias by subgroup

### Phase 3: Prospective Production (6+ months)
- **Data:** Prospective real-world screening data; longitudinal opt-in
- **Scope:** Production monitoring; continuous active learning
- **Deliverables:** Prospective performance; override rate; drift metrics
- **Gate:** Sustained performance; monitoring plan operational

---

## 6. Validation Config

Targets and gates are defined in `configs/validation_config.yaml` (PediScreen vs ROP AI comparison, Feb 2026).

## 7. Related Documents

- [Dataset Research](../docs/dataset_research.md)
- [Data Acquisition Checklist](../docs/data_acquisition_checklist.md)
- [FDA CDS Mapping](../docs/fda_cds_mapping.md)
- [Bias Audit](bias_audit.md)
- [Model Card](MODEL_CARD.md)
