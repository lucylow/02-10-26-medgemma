# PediScreen AI — Clinical Validation Framework

Production-grade validation for regulatory approval and clinician trust.

**Philosophy:** Every claim backed by metrics. Every metric has confidence intervals. Every model externally validated.

## Structure

```
validation/
├── benchmarks/           # Automated metric computation
│   ├── run_benchmark.py   # Gold holdout → validation report
│   └── run_safety_suite.py # Adversarial safety tests
├── datasets/              # Gold-standard labeled data
│   ├── gold_holdout.csv   # 90 clinician-labeled cases (Phase 1)
│   ├── gold_holdout.parquet  # (run scripts/generate_gold_holdout.py)
│   └── adversarial/      # Edge cases, safety traps
├── reports/              # Generated validation_report.json, model_card.txt
├── dashboards/           # Streamlit clinician review UI
└── README.md
```

## Quick Start

```bash
# 1. Generate gold holdout (if parquet needed)
make data-gold-holdout

# 2. Run validation benchmark (mock predictions for CI)
make validation

# 3. Run safety suite
make validate-safety

# 4. Run validation tests
make test-validation

# 5. Launch validation dashboard
streamlit run validation/dashboards/validation_dashboard.py
```

## Core Metrics (Level 1: Technical Accuracy)

PediScreen targets (vs ROP AI benchmark) — see `configs/validation_config.yaml`:

| Metric | Target |
|--------|--------|
| Sensitivity (refer) | ≥ 96% [93-98% CI] |
| Specificity | ≥ 82% [78-86% CI] |
| PPV | ≥ 65% (est; screening accepts lower) |
| NPV | ≥ 98% [97-99%] |
| AUC-ROC | ≥ 0.87 [0.84-0.90] |

## Safety (Level 2: Non-Negotiable)

| Metric | Target |
|--------|--------|
| False Negative Rate | ≤ 2% (3x better than ROP AI 6-12%) |
| False "On Track" for refer | 0 |
| Safety agent recall | 100% |

## FDA CDS Checklist

- ✅ Transparent to user (shows inputs/evidence)
- ✅ Doesn't automate decisions (clinician override)
- ✅ Narrow scope (screening only, no diagnosis)
- ✅ Validated performance (sens/spec w/ CIs)
- ✅ Monitoring plan (drift detection)
- ✅ Human review required (sign-off gates)

## API

```python
from src.validation import (
    ClinicalMetrics,
    SafetyMetrics,
    ValidationReport,
    get_validation_targets,
)

# Compute metrics with bootstrap CIs
metrics = ClinicalMetrics(y_true, y_pred, y_scores)
acc = metrics.compute_all(n_bootstrap=1000, include_ci=True)

# Check validation gates (uses configs/validation_config.yaml)
gates = metrics.check_validation_gates()

# Safety analysis
safety = SafetyMetrics(y_true, y_pred, case_ids=ids, observations=texts)
fn = safety.false_negative_analysis(high_risk_label="refer")
safety_gates = safety.check_safety_gates()

# Generate report (includes validation_gates, validation_targets)
report = ValidationReport(metrics=metrics, safety_metrics=safety)
report.render_json("validation/reports/validation_report.json")
```
