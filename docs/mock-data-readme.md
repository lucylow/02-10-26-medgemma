# Mock data for PediScreen UI/UX

This doc describes how to generate, serve, and use mock data so the frontend can be developed and demoed without a live model.

## Generate mock data

From repo root:

```bash
# Node (default): 50 cases, thumbnails, index
yarn gen:mock
# or
node scripts/generate_mock_data.js
```

Optional Python (deterministic, 40 cases by default):

```bash
pip install numpy  # if needed
python scripts/generate_mock_data.py
# optional: --seed 1234 --count 40 --out ./mock_data
```

Output:

- `mock_data/cases/*.json` — one JSON per case
- `mock_data/index.json` — list of case metadata for listing
- `mock_data/thumbnails/*.svg` — placeholder images (no real photos)
- `mock_data/MOCK_DATA_VERSION.txt` — version string

## Validate

```bash
yarn validate:mock
# or
node scripts/validate_mock_data.js
```

Validates required fields, risk enum, and confidence range. Edge cases (`case-missing-age`, `case-corrupt-embed`, `case-large-image`) are allowed to have `age_months` null or invalid embedding.

## Run mock server (demo-server)

Serves cases and inference so the app can run without a real backend.

```bash
node demo-server/index.js
```

Listens on **port 4002** (or `DEMO_SERVER_PORT`).

Endpoints:

- `GET /cases` — returns `mock_data/index.json`
- `GET /case/:id` — returns full case JSON
- `POST /infer` — body `{ "case_id": "case-0001" }` → returns `mock_inference` (with optional latency/failure)
- `GET /embeddings/:case_id` — returns `{ case_id, embedding_b64, emb_version }` or 404

Environment:

- `MOCK_LATENCY_MS` or `MOCK_LATENCY` — delay in ms before responding (e.g. `500`)
- `MOCK_FAIL_RATE` — probability of 500 response (e.g. `0.1`)

Simulate timeout from client:

- `POST /infer` with body `{ "case_id": "case-0001", "simulate": "timeout" }` → 504 after 15s

## Seed demo for offline / first load

To pre-populate demo cases for the app (e.g. when `VITE_DEMO_MODE=true`):

```bash
node scripts/seed_local_demo.js
```

This writes `public/demo-cases.json` with the first 20 cases from `mock_data/index.json` and their full case payloads. The app can load this when in demo mode or when "Load demo cases" is used.

## Demo mode (frontend)

1. Set `VITE_DEMO_MODE=true` or `VITE_DEMO=true`.
2. Start the demo-server: `node demo-server/index.js`.
3. Start the app: `yarn dev` or `yarn start:demo`.
4. The app will use `http://localhost:4002` for `/cases` and `/infer` (or `VITE_MOCK_SERVER_URL`).

## Storybook & Cypress

- **Storybook** — fixtures under `storybook/fixtures/` (e.g. `loadCase(id)`) and stories that import from `mock_data/cases/` or fixtures.
- **Cypress** — `cypress/fixtures/mock_cases/` can hold a subset of case JSONs; `cypress/fixtures/mock_server_config.json` can store test latency/failure config. E2E can point at the mock server and assert on result view (risk chip, parent_text, etc.).

## Data contract

See [mock_contract.md](./mock_contract.md) for the `mock_inference` and case-level field contract and examples.

## Handoff checklist

- [ ] `yarn gen:mock` (or Python script) run and `mock_data/` committed or generated in CI
- [ ] `node scripts/validate_mock_data.js` passes
- [ ] `node demo-server/index.js` runs and returns cases/infer
- [ ] Storybook builds: `yarn build-storybook`
- [ ] Demo: `VITE_DEMO_MODE=true` + demo-server + `yarn start:demo` → capture → infer → result with mock explanations and thumbnails
