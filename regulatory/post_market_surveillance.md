# Post-Market Surveillance Plan

**Product:** PediScreen AI  
**Version:** v1.0  
**Date:** Feb 2026  
**Alignment:** FDA post-market expectations for SaMD, Part 820.250.

---

## 1. Purpose

To collect and analyze real-world performance, safety, and use data after deployment, and to trigger corrective actions (e.g. model retrain, threshold change, labeling update) when needed.

---

## 2. Data Sources

- **Telemetry (anonymized):** Request volume, error/fallback rates, latency, cost; no PHI.
- **Drift metrics:** PSI on embeddings and predictions over time; trended in Grafana.
- **Bias metrics:** Demographic parity, equalized odds, FPR/FNR by subgroup; dashboard and periodic reports.
- **Clinical feedback:** Clinician overrides, corrections, and adverse events (captured via feedback API and workflow).
- **FHIR write-backs:** AI metadata (model, confidence, drift_level) on Observations for EHR-side audit.

---

## 3. Triggers for Review

- PSI or performance drift exceeding thresholds (e.g. PSI > 0.25, sensitivity drop > X%).
- Increase in error or fallback rate above baseline.
- Bias metric degradation or new subgroup disparity.
- User-reported issues or adverse events.
- Regulatory or internal audit finding.

---

## 4. Actions

- **Routine review:** Periodic (e.g. monthly/quarterly) review of dashboards and summary reports.
- **Investigation:** Root cause analysis when triggers are met; document in quality system.
- **Corrective action:** Model update, threshold change, or labeling/IFU update per change control; re-validation where required.
- **Reporting:** Serious adverse events and reportable events per regulatory requirements; maintain records for inspection.

---

## 5. Documentation and Retention

- Surveillance data and reports retained per quality system and regulatory retention requirements.
- Traceability to software version, config, and deployment environment.
