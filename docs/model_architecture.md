# Model architecture (HAI + MedGemma + MCP)

## Overview

The backend moved from a single LLM call to a **pipeline**:

```
Frontend
  ↓
Inference Controller
  ↓
Embedding Layer (MedSigLIP or mock)
  ↓
Risk Classifier (optional)
  ↓
MedGemma Reasoning Model (from registry: medgemma | mock)
  ↓
MCP Tool Layer (milestone, risk, guideline, confidence, audit)
  ↓
Post-Processor (validation + safety)
  ↓
Calibration (confidence bounds, clinician-review flag)
  ↓
Audit Logger
  ↓
Response
```

## Components

- **Model registry** (`app.models.model_registry`): Register and get backend by name. `MODEL_BACKEND=medgemma|mock` switches without code change.
- **Base model** (`app.models.interface.BaseModel`): All models implement `infer(input_data)`, `health_check()`, `metadata()`.
- **MedGemma model** (`app.models.medgemma_model.MedGemmaModel`): Wraps existing MedGemmaService; deterministic temperature, prompt versioning, JSON parse with fallback.
- **Mock model** (`app.models.mock_model.MockModel`): Deterministic mock for demos and tests.
- **Embedding model** (`app.models.embedding_model`): Produces embedding_b64 from image/input; mock available.
- **MCP tools** (`app.mcp`): `milestone_tool`, `risk_tool`, `guideline_tool`, `confidence_tool`, `audit_tool`. Whitelist-only invocation.
- **Orchestrator** (`app.mcp.orchestrator.MCPOrchestrator`): Runs model then tool chain; post-process and sanitize.
- **Inference controller** (`app.services.inference_controller`): Entry point: timeout (5s), retries (2), calibration, audit.

## Failsafe

- Model timeout or invalid JSON → structured fallback: `risk: manual_review_required`, `fallback: true`.
- Low confidence (<0.6) → `requires_clinician_review: true`.
- All fallback events are logged in the audit trail.

## Audit

Expanded audit entries include: `model_id`, `adapter_id`, `prompt_version`, `tool_chain`, `confidence`, `clinician_override`. See `app.services.audit.log_inference_audit_expanded`.
