# Pediatric Developmental Datasets for AI Screening

**Document Version:** 1.0  
**Last Updated:** 2026-02-14  
**Purpose:** Research summary for PediScreen AI data strategy and synthetic augmentation.

---

## Executive Summary

**Key Finding:** No large-scale, multimodal pediatric developmental screening datasets exist publicly. Current datasets focus on autism-specific screening (M-CHAT, ADOS) or single-domain outcomes. PediScreen AI's multimodal approach (text + drawings + longitudinal) requires **synthetic augmentation** of guideline-based data.

**Primary Sources Available:**
1. **M-CHAT-R/F** (17K+ screenings) — Autism only
2. **ASQ-3 Public Samples** (~1K items) — Structured items only
3. **CDC Milestones Database** — Ground truth reference
4. **Nadig ASD Dataset** (38 children) — Small multimodal
5. **Synthetic generation** — Required for scale

---

## 1. Structured Screening Datasets

### 1.1 M-CHAT-R/F (Modified Checklist for Autism in Toddlers)
- **Status:** Publicly available (17,000+ screenings)
- **Source:** https://mchatscreen.com/
- **Modalities:** 20-item parent questionnaire (yes/no)
- **Age:** 16–30 months
- **Labels:** Risk score (Low/Medium/High) + Follow-up needed
- **Coverage:** Autism screening only
- **License:** Research use OK
- **Metrics:** Sensitivity 87%, Specificity 99% (vs clinical diagnosis)

### 1.2 ASQ-3 (Ages & Stages Questionnaire, 3rd Ed.)
- **Status:** Limited public samples (~1,000 items)
- **Source:** Brookes Publishing + research papers
- **Modalities:** 30 items/domain × 5 domains × 21 ages
- **Age:** 1–60 months
- **Labels:** Pass / borderline / range of concern
- **Coverage:** Communication, Gross/Fine Motor, Problem Solving, Personal-Social
- **Public Access:** Sample items only; full dataset proprietary

### 1.3 CDC Developmental Milestones
- **Status:** Public guideline database (guideline2milestone.org)
- **Modalities:** 300+ milestones across 0–5 years
- **Age:** Monthly granularity
- **Structure:** Age → Domain → Milestone → % Children Achieving
- **License:** Public domain
- **Sample (24mo Communication):** Says ≥50 words (75%), 2-word combinations (50%), Follows 2-step directions (60%)

---

## 2. Research Datasets (Limited Scale)

| Dataset | Size | Modalities | Labels | Access |
|---------|------|------------|--------|--------|
| **Nadig ASD** | 38 children | Behavioral + parent report | ASD diagnosis | Restricted (academic) |
| **Taiwan DD** | 2,552 children, 34,862 visits | Therapy frequency | Future DD (binary) | Not public |
| **Multiview Motor** | Motor videos | Video (multi-camera) | Motor milestones | GigaDB (academic) |

---

## 3. Critical Gaps for PediScreen AI

**Missing Datasets:**
- No multimodal datasets (text + drawings)
- No longitudinal screening data
- No general developmental delay (non-autism)
- No CHW/parent free-text observations
- No real-world workflow data (intake → clinician → parent)

**Data Quality Issues:**
- Limited demographic diversity (mostly US/Europe)
- Proprietary clinical labels (ASQ full data)
- No temporal validation splits
- Class imbalance (rare high-risk cases)

---

## 4. Recommended Data Strategy

### Phase 1: Foundation (Immediate)
1. CDC Milestones (ground truth) → 100%
2. M-CHAT-R/F public (17K) → Autism proxy
3. ASQ-3 samples (1K) → Structured items
4. Synthetic generation (10K) → Fill gaps

### Phase 2: Scale (1–3 months)
1. Taiwan DD dataset (collaboration)
2. Synthetic → 50K records (clinician-reviewed)
3. Production data collection (opt-in anonymized)

### Phase 3: Production (6+ months)
1. Multi-site clinical validation (4+ sites)
2. Longitudinal real-world data
3. Continuous active learning

---

## 5. Synthetic Data Pipeline (Required)

Given dataset scarcity, synthetic augmentation is mandatory. Generation should be:
- **Grounded in CDC/ASQ** + clinician review
- **Constrained** by age-appropriate percentiles (e.g., vocab_words, word_combos)
- **Stratified** by target risk distribution (e.g., 0.3 on_track, 0.4 monitor, 0.2 discuss, 0.1 refer)
- **Clinician-reviewed** sample (e.g., 10%) for quality assurance

---

## 6. Data Acquisition Priority List

| Priority | Source | Status |
|----------|--------|--------|
| **HIGH** | CDC Milestones Database | ✅ Public |
| **HIGH** | M-CHAT-R/F public data | ✅ Public |
| **HIGH** | ASQ-3 research samples | ✅ Limited |
| **MEDIUM** | Taiwan DD dataset | Collaboration |
| **MEDIUM** | Nadig multimodal | Restricted |
| **MEDIUM** | Motor video dataset | Academic |
| **LOW** | Multi-site clinical partnerships | Production |
| **LOW** | Longitudinal opt-in data | Production |

---

## 7. Regulatory Considerations (FDA CDS)

**Data Requirements:**
- Representative of intended use population
- Independent test set (temporal split)
- Known limitations documented
- Continuous monitoring plan

**PediScreen Compliance Plan:**
- **Phase 1:** Synthetic + public → Internal validation
- **Phase 2:** Multi-site → External validation
- **Phase 3:** Prospective → Production monitoring

---

## References

- M-CHAT: https://mchatscreen.com/
- CDC Milestones: guideline2milestone.org
- Taiwan DD: PLOS ONE (2012–2016)
- Nadig ASD: Nature (academic request)
- Stanford Children's Growth: PMC

---

## Related Documents

- [Data Acquisition Checklist](data_acquisition_checklist.md) — Track acquisition progress
- [Model Validation Plan](../models/validation_plan.md)
- [Architecture](architecture.md)
