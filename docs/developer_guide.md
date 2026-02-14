# PediScreen AI — Developer Guide

## Modular Architecture

PediScreen AI uses a modular architecture for continuous monitoring, validation, and clinical workflow support. See [architecture.md](architecture.md) for the full design.

## Quick Start

### CLI

```bash
# Install (from project root)
pip install -e .

# Run validation suite
pedi validate run-suite --output ./validation_reports

# Check monitoring status
pedi monitor status

# Check alerts
pedi monitor alerts

# EHR sync (stub)
pedi workflow sync
```

### Backend API

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Module Layout

| Module | Purpose |
|--------|---------|
| `pedi_screen/medgemma_core/` | Inference engine, model loading, explainability |
| `pedi_screen/validation/` | Benchmark tests, bias audit |
| `pedi_screen/monitoring/` | Metrics, aggregator, alerting |
| `pedi_screen/clinical_workflow/` | FHIR connector, patient state |
| `pedi_screen/feedback/` | Clinician feedback service |
| `pedi_screen/utils/` | Structured logging |

## Configuration

- `configs/inference.yaml` — Model and inference settings
- `configs/monitor.yaml` — Telemetry exporters
- `configs/alerts.json` — Alert thresholds

## Adding Validation Data

Place labelled test data in `data/validation_set/`:

- `benchmark.json` — `labels` and `predictions` per modality
- `bias_audit.json` — Subgroup performance by demographic

## CI

The `ci-monitor.yaml` workflow runs validation nightly and on push/PR.
