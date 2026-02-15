# PediScreen Model Card

**Model ID:** pediscreen-2b-adapter  
**Base Model:** google/medgemma-2b-it  
**Adapter:** LoRA (r=8, alpha=32)

---

## Intended Use

- **Purpose:** Clinical decision support for developmental screening (ages 0–5)
- **Users:** Community health workers, clinicians
- **Input:** Text observations, optional image embeddings
- **Output:** Risk stratification, recommendations, clinical summary

---

## Limitations

- Not a medical device; clinician review required
- Performance limited by fine-tuning data specificity
- May not generalize to all cultural/linguistic contexts

---

## Training Data Summary

- Synthetic developmental scenarios (~5K) from CDC milestones and ASQ-3
- No real PHI in training

---

## Evaluation Metrics

| Metric | Target |
|--------|--------|
| Sensitivity (refer) | > 0.85 |
| Specificity | > 0.80 |
| False negative rate | Minimize |

---

## Fairness & Bias

- Bias audit across age, sex, language slices (see models/bias_audit.md)
- Ongoing monitoring for distribution drift

---

## Provenance

- Base: google/medgemma-2b-it (HAI-DEF)
- Adapter: LoRA fine-tuned for pediatric developmental reasoning
- See model/README.md for weight trace
