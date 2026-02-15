# PediScreen AI — Modular Architecture for Continuous Monitoring & Clinical Validation

This document describes the modular architecture that enables **continuous monitoring**, **automated validation**, and **clinical workflow support** for the PediScreen AI system.

---

## Vision & Goals

| Goal | Description |
|------|-------------|
| **Continuous Model Monitoring** | Track inference duration, confidence distributions, and model performance over time |
| **Automated Validation Pipelines** | CI-triggered evaluation suites with sensitivity, specificity, PPV, NPV |
| **Clinical Workflow Integration** | EHR connectors, clinical task notifications, feedback hookbacks |
| **Pluggable Analytics & Dashboards** | Grafana/Superset templates, exportable CSV/JSON |
| **Feedback Loops** | Clinician corrections linked to model performance KPIs |
| **Alerting & Drift Detection** | Threshold-based alerts for confidence drops, drift, override rates |

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph UI["User Interfaces"]
        Web[Web Portal]
        Mobile[Mobile App]
        CLI[CLI (pedi)]
    end

    subgraph API["API Layer"]
        FastAPI[FastAPI Backend]
    end

    subgraph Core["medgemma_core/"]
        ML[model_loader.py]
        IE[inference_engine.py]
        EX[explainability.py]
    end

    subgraph Validation["validation/"]
        Suite[suite.py]
        Bench[benchmark_tests.py]
        Bias[bias_audit.py]
    end

    subgraph Monitoring["monitoring/"]
        Met[metrics.py]
        Agg[aggregator.py]
        Alt[alerting.py]
    end

    subgraph Clinical["clinical_workflow/"]
        FHIR[fhir_connector.py]
        EHR[ehr_notifications.py]
        PS[patient_state.py]
    end

    subgraph Feedback["feedback/"]
        DB[db.py]
        Svc[service.py]
    end

    subgraph Utils["utils/"]
        Log[logging.py]
    end

    subgraph Dashboards["dashboards/"]
        MetricsYAML[metrics_overview.yaml]
        ValYAML[validation_reports.yaml]
    end

    subgraph Config["configs/"]
        InfCfg[inference.yaml]
        MonCfg[monitor.yaml]
        AltCfg[alerts.json]
    end

    Web --> FastAPI
    Mobile --> FastAPI
    CLI --> Core
    CLI --> Validation
    CLI --> Monitoring
    CLI --> Clinical

    FastAPI --> Core
    FastAPI --> Feedback
    FastAPI --> Clinical

    Core --> Validation
    Core --> Monitoring
    Validation --> Monitoring
    Clinical --> Feedback
    Feedback --> Monitoring

    Monitoring --> Met
    Monitoring --> Agg
    Monitoring --> Alt

    Met --> Config
    Alt --> AltCfg
    Core --> InfCfg
```

---

## Module Responsibilities

### `medgemma_core/` — Inference Engine

**Purpose:** Reusable inference logic, model loading, and explainability.

| File | Responsibility |
|------|----------------|
| `model_loader.py` | Load MedGemma base model and LoRA adapters |
| `inference_engine.py` | Input → mediator → output pipeline; adapter management |
| `explainability.py` | Reasoning chain, evidence extraction, confidence scoring |

**Boundaries:** No direct API or UI; consumed by FastAPI and CLI.

---

### `validation/` — Automated Evaluators

**Purpose:** Continuous validation pipelines for model quality and bias.

| File | Responsibility |
|------|----------------|
| `suite.py` | Orchestrate evaluation runs; load labelled test sets |
| `tests/benchmark_tests.py` | Sensitivity, specificity, PPV, NPV; text-only, image-only, multimodal ablation |
| `tests/bias_audit.py` | Demographic subgroup performance; equity metrics |

**Output:** CSV/JSON reports for CI and dashboards.

**Clinical Validation Framework** (see `validation/README.md`): Production-grade validation for regulatory approval.

| Component | Responsibility |
|-----------|----------------|
| `src/validation/metrics.py` | ClinicalMetrics: sens/spec/PPV/NPV with 95% bootstrap CIs |
| `src/validation/safety.py` | SafetyMetrics, SafetyValidator: FN analysis, harmful language |
| `src/validation/drift.py` | DriftDetector: embedding/label shift, CUSUM |
| `src/validation/reporting.py` | ValidationReport: JSON, model card, FDA CDS checklist |
| `validation/benchmarks/run_benchmark.py` | Gold holdout → validation report |
| `validation/dashboards/validation_dashboard.py` | Streamlit clinician review UI |

---

### `monitoring/` — Telemetry & KPIs

**Purpose:** Record runtime and model performance metrics; drift detection; alerting.

| File | Responsibility |
|------|----------------|
| `metrics.py` | Track inference duration, confidence distributions, clinician overrides |
| `aggregator.py` | Aggregate metrics for dashboards |
| `alerting.py` | Threshold-based alerts (confidence, drift, override rate) |

**Exporters:** Local file, Cloud logging, StatsD (pluggable).

---

### `clinical_workflow/` — EHR Integration

**Purpose:** Backend logic for EHR connectors and clinical task notifications (no UI merge).

| File | Responsibility |
|------|----------------|
| `connectors/fhir_connector.py` | FHIR R4 export; patient/screening resources |
| `connectors/ehr_notifications.py` | Clinical task notifications |
| `patient_state.py` | Patient screening state; longitudinal context |

---

### `feedback/` — Clinician Corrections & Audit

**Purpose:** Store clinician corrections, versioning, KPI linkage.

| File | Responsibility |
|------|----------------|
| `db.py` | Feedback storage (Cloud SQL / in-memory) |
| `models.py` | Pydantic models for feedback records |
| `service.py` | API and CLI for capturing feedback |

---

### `utils/` — Shared Utilities

**Purpose:** Structured logging, common helpers.

| File | Responsibility |
|------|----------------|
| `logging.py` | JSON structured logging; metadata for downstream processing |

---

### `dashboards/` — Observability

**Purpose:** Templates for Grafana/Superset; exportable reports.

| File | Responsibility |
|------|----------------|
| `metrics_overview.yaml` | KPI dashboard definition |
| `validation_reports.yaml` | Validation metrics dashboard |

---

## Data Flow

1. **Inference:** Client → FastAPI → `medgemma_core` → Response + provenance
2. **Monitoring:** Inference events → `monitoring/metrics` → aggregator → dashboards / alerting
3. **Validation:** CI / nightly → `validation/suite` → benchmark + bias tests → reports
4. **Feedback:** Clinician → `feedback/service` → `feedback/db` → `monitoring` (override rate)
5. **Clinical:** `clinical_workflow` → FHIR export, EHR notifications, patient state

---

## Configuration

| Config | Purpose |
|-------|---------|
| `configs/inference.yaml` | Model paths, adapter IDs, temperature |
| `configs/monitor.yaml` | Telemetry exporters, retention |
| `configs/alerts.json` | Thresholds for confidence, drift, overrides |

---

## Success Criteria

- [x] Modular delineation with clear boundaries
- [ ] CI/CD pipelines trigger automated evaluation suites
- [ ] Logging & telemetry for production inference and feedback
- [ ] Real-time KPI dashboards (internal and clinician)
- [ ] Alert system for drift, errors, or performance degradation
