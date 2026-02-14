# PediScreen AI — Operational Runbook

## Start Locally

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Unix
pip install -r requirements.txt -r requirements-dev.txt
export REAL_MODE=false
export EMBED_MODE=dummy
uvicorn backend.api:app --reload --port 8000
```

## Run Demo

```bash
./scripts/run_demo.sh           # Real mode (if models available)
./scripts/run_demo.sh --ci      # Dummy mode (CI)
```

## Run Inference Script

```bash
./scripts/run_inference.sh
./scripts/run_inference.sh --ci
```

## Add a New Adapter

1. Place adapter in `adapters/<adapter_id>/`
2. Update `adapters/registry.json` with metadata
3. Set `ADAPTER_PATH=./adapters/<adapter_id>`
4. Restart API

## Run CI Smoke Locally

```bash
REAL_MODE=false EMBED_MODE=dummy pytest -q
```

## Audit & Monitoring

- Audit log: `data/audit_log.jsonl`
- Summary: `python scripts/summary_audit.py`
- API: `GET /audit_summary` returns counts (total, fallback_used, errors)

## Rotate Keys

- Use KMS (AWS/GCP) for production keys
- Set `SERVER_PRIVATE_KEY_B64` via env / secrets
- Document in GitHub Secrets for CI
