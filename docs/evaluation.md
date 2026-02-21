# Evaluation

## Runner

`backend/evaluation/evaluate.py` runs all mock cases through the inference controller and writes `evaluation_report.json`.

### Metrics

- **Risk distribution**: Count per risk level (low, monitor, high, refer, manual_review_required).
- **Average confidence**: Mean of confidence across cases.
- **Fallback triggered %**: Proportion of runs that returned fallback (timeout, error, or low confidence).
- **Latency**: min, max, avg seconds per inference.

### Usage

From repo root:

```bash
# Use data/test_cases.jsonl (or synthetic if missing)
python backend/evaluation/evaluate.py --cases data/test_cases.jsonl --output backend/evaluation/evaluation_report.json
```

From backend:

```bash
cd backend
python evaluation/evaluate.py --cases ../data/test_cases.jsonl --output evaluation/evaluation_report.json
```

### Report shape

```json
{
  "total_cases": 48,
  "risk_distribution": { "low": 10, "monitor": 20, "high": 12, "refer": 6 },
  "average_confidence": 0.72,
  "fallback_triggered_pct": 0,
  "latency_seconds": { "min": 0.01, "max": 0.05, "avg": 0.02 },
  "results_sample": [ ... ]
}
```

## Unit tests

See `backend/tests/test_model_*.py` and `backend/tests/test_mcp_*.py` for:

- Model JSON schema compliance
- Tool execution logic
- Fallback triggering
- Confidence calibration
- Orchestrator pipeline

Target: minimum 85% coverage for model + MCP code.
