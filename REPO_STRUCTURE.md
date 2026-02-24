# Repository structure — PediScreen AI

This document describes how the repo is organized and what Lovable Cloud expects. **Do not move or rename the Lovable-critical paths** below or deployment will break.

## Lovable Cloud (canonical frontend)

The app deployed to [Lovable](https://medgemma13213123.lovable.app/) is built from the **repository root**. These paths must stay at root:

| Purpose        | Path                | Notes                                      |
|----------------|---------------------|---------------------------------------------|
| Build config   | `lovable.config.js` | `build.command`: `npm run build`, output: `dist` |
| Entry HTML     | `index.html`        | Loads `/src/main.tsx`                       |
| Frontend app   | `src/`              | React app; `@/` alias points here           |
| Vite config    | `vite.config.mjs`   | Uses root `src/`, lovable-tagger in dev     |
| Package & deps | `package.json`      | `npm run build` → `vite build`              |
| Tailwind       | `tailwind.config.ts`| Content: `./src/**`, `./index.html`          |
| TS config      | `tsconfig.json`, `tsconfig.app.json` | `@/*` → `./src/*`, include: `src` |
| Static assets  | `public/`           | Served at `/`                               |
| Build output   | `dist/`             | Produced by `npm run build` (gitignored)     |

- **Local dev:** `npm run dev` (Vite, port 8080).  
- **Static demo:** `frontend/` (standalone CHW + Clinician UI); run with `npm run start:demo`.  
- **Redirect to Lovable:** `local-entry/index.html`; `npm run start` serves it.

## Backend and APIs

| Role              | Path              | Notes                          |
|-------------------|-------------------|--------------------------------|
| Primary backend   | `backend/`        | FastAPI; `/api/analyze`, `/api/infer`, agents, etc. |
| Alternate backend | `app/backend/`    | Lovable/Supabase scaffold; `/v1/process_case` |
| Edge functions    | `supabase/functions/` | Deno; deploy with `supabase functions deploy` |

## Other important directories (logical grouping)

- **Training / ML:** `training/`, `eval/`, `model-dev/`, `dataset-prep/`, `models/`, `model/`, `modelserver/`, `model-server/`
- **Agents / orchestration:** `backend/app/agents/`, `orchestrator/`, `pedi-agent-stack/`, `agent_system/`
- **Mobile / edge:** `mobile/`, `mobile-app/`, `edge/`, `embedder/`, `modelreasoner/`
- **Data & config:** `data/`, `config/`, `configs/`, `mock_data/`, `migrations/`, `alembic/`
- **Infra & deploy:** `deploy/`, `k8s/`, `helm/`, `charts/`, `grafana/`, `prometheus/`, `monitoring/`
- **Docs & runbooks:** `docs/`, `AGENTS.md`, `README.md`, `RUNBOOK*.md`, `FRONTEND_*.md`
- **Tests:** `test/`, `tests/`, `cypress/`, `backend/tests/`, `app/backend/tests/`
- **Scripts:** `scripts/` (training, export, etc.)
- **Contracts / blockchain:** `contracts/`, `artifacts/`, `pediscreen-dapp/`, `pediscreen-dao-frontend/`
- **Compliance / security:** `compliance/`, `security/`, `regulatory/`, `validation/`
- **Other app scaffolds:** `app/frontend/` (alternate Lovable-style UI; not the deployed app)

## Config files at root (needed for Lovable / build)

- `vite.config.mjs` — Vite + lovable-tagger (do not remove).  
- `vite.config.ts` — May be unused if build uses `.mjs`; keep for compatibility.  
- `tailwind.config.ts`, `postcss.config.js`, `components.json` — Styling.  
- `eslint.config.js`, `cypress.config.js` / `.ts` — Lint and E2E.  
- `.env.example`, `.env` — Env template and local overrides; set `VITE_*` for Supabase/Lovable.

## Summary

- **Single canonical UI for Lovable:** root `src/` + `index.html` + root `package.json` + `vite.config.mjs` + `lovable.config.js`.  
- **Build:** `npm run build` → `dist/`.  
- **TypeScript and Tailwind** are aligned to root `src/` so the repo is ordered around one main frontend while still working with Lovable.
