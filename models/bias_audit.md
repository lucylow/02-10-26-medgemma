# Bias Audit Plan

**Document Version:** 1.0  
**Last Updated:** 2026-02-14

---

## Slices

| Slice | Variable | Test |
|-------|----------|------|
| Age | age_months (0–24, 24–48, 48–72) | Performance by age band |
| Sex | child_sex (if available) | Parity check |
| Language | observations language | Cross-linguistic fairness |
| Socioeconomic proxy | Region / care setting | Equity analysis |

---

## Metrics per Slice

- Sensitivity, specificity
- Calibration (predicted vs actual risk)
- Disparate impact ratio

---

## Actions

- If disparity > 10% across slices: investigate, document, mitigate
- Retrain or threshold-adjust if warranted
