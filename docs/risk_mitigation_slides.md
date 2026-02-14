# Risk-Mitigation Slide Deck for Judges

Copy into PowerPoint/Google Slides. Keep visuals simple: use the PediScreen color, an icon per slide, and show 1–2 supporting screenshots where indicated.

---

## Slide 1 — Title / Hook

**Title:** PediScreen AI — Responsible Pediatric Screening at Scale

**Bullets:**
- AI-assisted screening to reduce documentation burden
- Designed as Clinical Decision Support (CDS) with human sign-off

**Speaker note:** Briefly state mission: speed up screening and documentation while preserving clinician control.

---

## Slide 2 — Key Legal & Safety Principles

**Title:** Legal & Safety Principles (Design-by-Default)

**Bullets:**
- Human-in-the-loop for all clinical actions
- PHI redaction before external model calls
- Audit trail for every generation & edit

**Speaker note:** Emphasize we prioritized privacy, auditability, and clinician responsibility.

---

## Slide 3 — FDA CDS Mapping (summary)

**Title:** Mapping to FDA CDS Exemption Criteria

**Bullets:**
- Drafts labeled + clinician review (Criterion A)
- Evidence + provenance shown (Criterion B)
- Sign-off gating EHR writes (Criterion C)

**Speaker note:** Show the 1:1 feature → criterion mapping, link to appendix for detailed mapping.

---

## Slide 4 — PHI & Privacy Controls

**Title:** Privacy Controls & Data Minimization

**Bullets:**
- Client/server PHI redaction pipeline (regex + NER)
- Consent modal for parents; consent stored in DB
- Retention job: automated purge/anonymization policy

**Speaker note:** Explain that the demo uses synthetic data; for production we would support on-device inference.

---

## Slide 5 — Explainability & Transparency

**Title:** Explainability — Trust through Evidence

**Bullets:**
- Key evidence block (scores, transcript snippets, image findings)
- Model provenance (model id, prompt hash) attached to each claim
- Visual heatmaps for images (explainability)

**Speaker note:** These make outputs auditable and assessable by clinicians.

---

## Slide 6 — Clinician Workflow & Sign-off

**Title:** Clinician Workflow (Draft → Review → Sign)

**Bullets:**
- Draft generation (AI assists) → Clinician edits → Sign & finalize → Optional EHR push
- Sign-off requires clinician credential + note (non-automatable)

**Speaker note:** Stress this prevents autonomous system actions and reduces liability risks.

---

## Slide 7 — Bias & Fairness Plan

**Title:** Bias Mitigation & Monitoring

**Bullets:**
- Validate on stratified datasets (race, language, region)
- Periodic bias audits logged to report_audit
- Continuous monitoring dashboard for subgroup performance

**Speaker note:** Show that fairness is a continuous program, not a one-time check.

---

## Slide 8 — Data Security & Compliance

**Title:** Security & Compliance Controls

**Bullets:**
- Encryption at rest & in transit; principle of least privilege for service accounts
- Secret Manager & Cloud IAM for production deployments
- E&O / Cyber insurance recommended for production rollout

**Speaker note:** Technical plus operational controls. We used Google best practices in the architecture.

---

## Slide 9 — Risk Register (Top 5 risks & mitigations)

**Title:** Top Risks & Mitigations (Executive view)

| Risk | Mitigation |
|------|------------|
| Wrong triage | Clinician sign-off, audit trail, conservative thresholds |
| PHI leak | Redaction + access controls + retention limits |
| Model drift | Periodic retrain + validation + rollback plan |
| Bias | Stratified evaluation + mitigation tracks |
| Regulatory misclassification | Position as CDS; counsel review before production |

**Speaker note:** Walk through each row quickly, show which mitigations are implemented in code.

---

## Slide 10 — Ask & Next Steps

**Title:** What We Need to Scale Safely

**Bullets:**
- Clinical partners for prospective validation (small pilot)
- Legal review for deployment & optional SaMD pathway planning
- Funding/resources for secure deployment & bias audits

**Speaker note:** Close with a specific ask for pilot partners and legal review support.
