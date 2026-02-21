# Frontend runbook — MedGemma / PediScreen

**Repo:** lucylow/02-10-26-medgemma  
**Last updated:** 2026-02-20

## Start commands

```bash
# From repo root
npm install
npm run dev
```

- Dev server: **http://localhost:8080** (or the port Vite prints).
- Storybook: `yarn storybook` → **http://localhost:6006**.

## Environment variables & toggles

| Variable | Purpose | Default / example |
|----------|---------|--------------------|
| `VITE_MEDGEMMA_API_URL` | Backend API base (inference, etc.) | `http://localhost:8000/api` (dev) |
| `VITE_API_KEY` | API key for backend | `dev-example-key` |
| `VITE_ASSEMBLYAI_KEY` | AssemblyAI for voice transcription | (optional) |
| `MOCK_FALLBACK` | Use mock inference when endpoint fails | `false` (set `true` to test fallback UI) |

Create `.env` or `.env.local` with any overrides. For local backend:

```env
VITE_MEDGEMMA_API_URL=http://localhost:8000/api
VITE_API_KEY=your-key
```

## How to simulate offline

1. **Chrome DevTools:** Network tab → Throttling → "Offline".
2. **Application → Service Workers:** Unregister or set to offline if applicable.
3. **Code:** In `App.tsx`, online/offline is handled via `window.addEventListener('online', ...)`; queue flush runs when going back online.

Captures are stored in IndexedDB (`pediscreen-offline`). After reconnecting, submissions in the queue are sent via `flush(sendPayload)`.

## Major flows to run locally

1. **Capture → inference:** Go to `/pediscreen/screening`, complete consent if shown, fill age/domain/observations (and optionally voice/image), submit. Then open `/pediscreen/results` (or follow redirect).
2. **Clinician review:** Go to `/clinician` or `/clinician/review` (and `/pediscreen/case/:id` for case detail).
3. **Offline:** Set network to offline, submit a screening, then go online and confirm toast for uploaded screenings.

## Known limitations

- Consent is stored in browser storage; clearing site data resets consent and the user will see the consent modal again.
- Mock fallback: when the model endpoint fails or times out and `MOCK_FALLBACK` is enabled, the UI shows a clearly labeled draft result; clinician review is required.
- Voice input depends on Web Speech API (Chrome/Edge); unsupported browsers get a text-area fallback.

## Lint, test, Storybook

```bash
yarn lint
yarn test
yarn storybook
yarn build-storybook
```

## Troubleshooting

- **Blank screen:** Check console for errors; ensure `npm run build` succeeds and env vars are set if required.
- **API errors:** Confirm backend is running and `VITE_MEDGEMMA_API_URL` points to it.
- **Consent modal every time:** Check that localStorage (or consent store) is not cleared; ensure `consentService` / ConsentModal write and read the same key.
