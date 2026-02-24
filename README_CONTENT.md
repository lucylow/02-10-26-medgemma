# Copy this content into README.md if your README is empty or corrupted.

# PediScreen AI

**Pediatric developmental screening assistant powered by MedGemma — one canonical pipeline from device/embedding to CDS output, with PHI-safe infra and multi-agent orchestration.**

```
Device/CHW --> Embedding (MedSigLIP) --> MedGemma (HF/Vertex) --> Safety & Audit --> Clinician + Blockchain
```

## Run it in 5 minutes

- **Colab:** Clone repo, `pip install -r medgemma_client/requirements.txt`, run `notebooks/quickstart_medgemma.ipynb`.
- **Docker (local):** `cd backend && docker compose up` then API at http://localhost:8000 — `GET /health`, `POST /api/orchestrate/case` (see docs/overview.md).
- **Orchestrator only:** `MEDGEMMA_BACKEND=mock uvicorn orchestrator.main:app --reload` then `POST /process_case` (if mounted) or use `orchestrator/main_app.py` app.

## Repository layout

| Area | Path | Purpose |
|------|------|---------|
| MedGemma | `medgemma_client/` | Canonical client: local_client, vertex_client, mock_client, schemas. |
| App | `backend/`, `frontend/`, `src/` | API (orchestrate), agents. |
| Orchestrator | `orchestrator/` | Multi-agent pipeline; MEDGEMMA_BACKEND=mock/local/vertex/hf. Add `process_case_router` to main app for /process_case. |
| Edge | `edge/` | jetson/, coral/; shared embedding contract. |
| Server | `server/` | Minimal /infer, /infer_encrypted, /health + Docker. |
| Infra | `deploy/`, `k8s/`, `training/`, `contracts/` | Deploy, K8s, training, blockchain. |

## Further reading

- [Overview](docs/overview.md) — Diagram, 5-min demo, feature to file map.
- [Architecture](docs/architecture.md) — Pipeline, tiers, devices.
- [MedGemma](docs/medgemma.md) — Model IDs, adapters.
- [Privacy & regulatory](docs/privacy-regulatory.md) — CDS, FDA/CE.
- [Multi-agent](docs/multi-agent-orchestration.md) · [Federated](docs/FEDERATED_LEARNING.md) · [Blockchain](docs/BLOCKCHAIN_INTEGRATION.md) · [AGENTS.md](AGENTS.md)

## Quick links

- Training: `bash scripts/run-pediscreen-training.sh`
- Orchestrate: `POST /api/orchestrate/case` — see AGENTS.md.
