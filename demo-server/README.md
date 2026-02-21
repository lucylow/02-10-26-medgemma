# PediScreen Demo Server

Local API for demo mode: serves mock cases, inference, and FHIR DocumentReference storage.

## Run

From repo root:

```bash
cd demo-server && npm install && npm start
```

Or with Node directly (after `npm install` in demo-server):

```bash
node demo-server/index.js
```

Listens on **port 4002** by default. Set `DEMO_SERVER_PORT` to override.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cases` | List cases (from mock_data/index.json or scanned cases/) |
| GET | `/case/:id` | Get one case by case_id (e.g. case-0001) |
| POST | `/infer` | Body: `{ "case_id": "case-0001" }` — returns mock_inference with optional latency |
| POST | `/fhir/document` | Body: FHIR DocumentReference JSON — stored under mock_data/fhir/ |
| GET | `/health` | Health check |

## Environment

- `MOCK_LATENCY` — delay in ms before responding to POST /infer (default 500).
- `MOCK_FAIL_RATE` — 0–1; random chance to return 500 on /infer (for testing fallback).
- `DEMO_SERVER_PORT` — port (default 4002).

## Prerequisites

Generate mock data first: from repo root run `yarn gen:mock` (or `node scripts/generate_mock_data.js`).
