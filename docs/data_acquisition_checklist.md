# Data Acquisition Checklist

**Document Version:** 1.0  
**Last Updated:** 2026-02-14  
**Purpose:** Track data acquisition progress for PediScreen AI training and validation.

---

## High Priority (Public / Immediate)

| # | Source | Status | Notes |
|---|--------|--------|------|
| 1 | **CDC Milestones Database** | ✅ Available | Run `python data/download_public.py`; used as ground truth |
| 2 | **M-CHAT-R/F public data** | ✅ Available | 17K+ screenings via download_public.py; autism proxy |
| 3 | **ASQ-3 research samples** | ⬜ Pending | ~1K items; Brookes Publishing / research papers |

---

## Medium Priority (Academic / Collaboration)

| # | Source | Status | Notes |
|---|--------|--------|------|
| 4 | **Taiwan DD dataset** | ⬜ Pending | 2,552 children, 34,862 visits; contact authors |
| 5 | **Nadig multimodal** | ⬜ Pending | 38 children; restricted academic request |
| 6 | **Motor video dataset** | ⬜ Pending | GigaDB; gross motor domain adaptation |

---

## Low Priority (Production)

| # | Source | Status | Notes |
|---|--------|--------|------|
| 7 | **Multi-site clinical partnerships** | ⬜ Pending | 4+ sites for external validation |
| 8 | **Longitudinal opt-in data** | ⬜ Pending | Production data collection pipeline |

---

## Synthetic Data (Required)

| # | Task | Status | Notes |
|---|------|--------|------|
| 9 | **CDC-grounded synthetic generator** | ✅ Implemented | `python -m data.processing.synthetic_generator --n 10000` |
| 10 | **Target 10K records (Phase 1)** | ⬜ Pending | Run generator; clinician review 10% sample |
| 11 | **Target 50K records (Phase 2)** | ⬜ Pending | Scale + clinician-reviewed |

---

## Next Actions

1. **Today:** Download M-CHAT + CDC via `python data/download_public.py`
2. **This week:** Run synthetic generator for 10K records; recruit 3–5 pediatricians for label review
3. **1–3 months:** Contact Taiwan DD authors for collaboration; scale synthetic to 50K
4. **6+ months:** Multi-site clinical validation; longitudinal data collection

---

## Related Documents

- [Dataset Research](dataset_research.md)
- [Model Validation Plan](../models/validation_plan.md)
- [Architecture](architecture.md)
