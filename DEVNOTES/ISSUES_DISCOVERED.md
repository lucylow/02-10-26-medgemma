# Issues Discovered — Repo Audit

**Date:** 2026-02-14

## TODO / FIXME / Hack References

| File | Line | Issue |
|------|------|-------|
| `src/pages/TechnicalWriter.tsx` | 61, 189 | Audience set to 'hackathon judges and clinicians' (UI copy, not code issue) |
| `app/frontend/src/pages/TechnicalWriter.tsx` | 61, 189 | Same as above |
| `src/pages/ClinicianReviewWithCollab.tsx` | 46 | `TODO: Replace with real auth — get user from context or auth provider` |
| `app/frontend/index.html` | 6, 11 | `TODO: Set the document title`, `TODO: Update og:title` |

## Static Check Notes

- `python -m pip install -r requirements.txt`: May fail if torch/transformers versions conflict; faiss not in requirements.
- Multiple `requirements.txt` files (root, backend, embed_server, etc.) — consider consolidating or documenting hierarchy.
- `backend/app/services/medgemma_service.py` uses Vertex/HF APIs; no local PEFT loading path for CI/dummy mode.
- `embed_server` uses `USE_DUMMY`; prompt specifies `EMBED_MODE` (dummy/real/distill) — naming inconsistency.

## Structural Issues

- No unified `backend/api.py` entry point as specified in prompt.
- No `backend/schemas.py` with canonical inference/embedding contracts.
- No `backend/audit.py` for append-only JSONL audit trail.
- No `backend/explainability.py` for FAISS nearest-neighbor retrieval.
- No `adapters/registry.json` or `model_card/` governance artifacts.
- No `.github/workflows/ci.yml` for PR checks.
- No `scripts/smoke_ci.sh` for Docker smoke test.
- No `RUNBOOK.md` or `docs/contracts.md`.
