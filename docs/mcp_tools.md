# MCP tools

## Purpose

Structured tools run **after** the reasoning model to add milestone checks, risk normalization, guidelines, confidence calibration, and audit payload. Tools are **whitelist-only**; arbitrary tool invocation is not allowed.

## Registry

- `MCPToolRegistry`: `register(tool)`, `run(tool_name, context)`, `run_optional(tool_name, context)`.
- Allowed names: `milestone_tool`, `risk_tool`, `guideline_tool`, `audit_tool`, `confidence_tool`.

## Tools

| Tool             | Purpose |
|------------------|--------|
| `milestone_tool` | Developmental expectations by age band; returns milestones and optional gaps for explainability. |
| `risk_tool`      | Maps context to risk category; can override with heuristic (e.g. low confidence → manual_review_required). |
| `guideline_tool` | Maps risk to WHO/AAP-style guidance text. |
| `confidence_tool`| Calibrated confidence = model_confidence * data_quality_factor; sets requires_clinician_review if &lt; 0.6. |
| `audit_tool`     | Builds audit payload (tool_chain, model_id, confidence, etc.) for the caller to log. |

## Orchestrator

`MCPOrchestrator(model, tool_registry)` runs:

1. `model.infer(input_data)` → base output.
2. For each tool in chain (default: milestone_tool, risk_tool, confidence_tool), `tool_registry.run(tool_name, context)` and merge result into context.
3. Post-process: validate schema, confidence bounds, fallback if needed.
4. Return context (with `tool_chain` for audit).

## Security

- Input validation: caregiver text length capped (e.g. 5000 chars).
- Tool whitelist only; `run(tool_name, ...)` raises if tool not allowed.
- No raw PHI in tool logs; only case_id and metadata.
