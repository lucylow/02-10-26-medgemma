# PediScreen AI — Module Reference

## medgemma_core

Inference engine, model loading, and explainability.

- **model_loader.py** — `ModelLoader`: Load base model and LoRA adapters
- **inference_engine.py** — `InferenceEngine`: Input → output pipeline; delegates to backend MedGemmaService
- **explainability.py** — `extract_reasoning_chain`, `extract_evidence`: Parse model output

## validation

Automated evaluation pipelines.

- **suite.py** — `run_validation_suite`: Orchestrate benchmark + bias audit; output JSON/CSV
- **tests/benchmark_tests.py** — Sensitivity, specificity, PPV, NPV by modality
- **tests/bias_audit.py** — Demographic subgroup performance

## monitoring

Telemetry and alerting.

- **metrics.py** — `record_inference`, `record_feedback`: Track events
- **aggregator.py** — `get_aggregated_metrics`: Aggregate for dashboards
- **alerting.py** — `check_alerts`: Threshold-based alerts

## clinical_workflow

EHR integration (backend logic).

- **connectors/fhir_connector.py** — `FHIRConnector`: FHIR R4 export
- **connectors/ehr_notifications.py** — Clinical task notifications
- **patient_state.py** — `PatientState`: Screening state

## feedback

Clinician corrections.

- **db.py** — In-memory/store for feedback
- **models.py** — Feedback record schema
- **service.py** — `FeedbackService`: Create and retrieve feedback

## utils

- **logging.py** — JSON structured logging
