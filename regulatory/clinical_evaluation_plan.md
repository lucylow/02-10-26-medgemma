# Clinical Evaluation Plan

**Product:** PediScreen AI  
**Version:** v1.0  
**Date:** Feb 2026  
**Purpose:** Support safety and performance claims for FDA and clinical adoption.

---

## 1. Objective

To demonstrate that PediScreen AI, when used as intended (AI-assisted developmental screening with mandatory clinician review), has acceptable sensitivity/specificity and does not introduce unacceptable bias or harm compared to baseline screening practice.

---

## 2. Study Design (Prospective Observational Validation)

- **Design:** Prospective observational validation study in real-world screening workflow.
- **Sample size (target):** N = 5,000 children (with power justification in protocol).
- **Sites:** Multiple care settings (e.g. pediatric primary care, CHW-led screening) to support generalizability.

---

## 3. Endpoints

### Primary

- **Sensitivity vs. baseline screening:** Proportion of true developmental concerns correctly flagged by PediScreen AI (with clinician confirmation) compared to standard screening alone.
- **Specificity:** Proportion of children correctly identified as not requiring referral, to limit unnecessary burden.

### Secondary

- **Time-to-referral reduction:** Time from screening to referral decision when AI is used vs. baseline.
- **Bias parity across subgroups:** Sensitivity and specificity by age band, language, and other prespecified demographics; target parity within acceptable bounds (defined in statistical analysis plan).

---

## 4. Data and Labeling

- Inputs: De-identified or tokenized screening observations and, where applicable, image-derived embeddings (MedSigLIP).
- Reference standard: Clinician-confirmed outcome and/or follow-up gold standard (e.g. formal evaluation) where available.
- Labeling and adjudication process documented; inter-rater reliability where applicable.

---

## 5. Analysis

- Primary analysis per protocol; sensitivity/specificity with 95% CIs.
- Subgroup analyses for bias; demographic parity and equalized odds reported.
- Pre-specified success criteria for performance and fairness (documented in SAP).

---

## 6. Deliverables

- Clinical evaluation report (CER) summarizing safety and performance.
- Updated risk management and labeling based on results.
- Post-market surveillance plan linked to real-world evidence collection.
