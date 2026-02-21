# Frontend inventory — MedGemma / PediScreen

**Repo:** lucylow/02-10-26-medgemma  
**Last updated:** 2026-02-20

## Stack

| Item | Version / value |
|------|------------------|
| Framework | React 18 (Vite) |
| Language | TypeScript |
| Build | Vite 5 |
| UI | Radix (shadcn/ui), Tailwind CSS, Framer Motion |
| State / data | TanStack Query, React Context (Screening, Agent, Supabase Auth) |
| Routing | react-router-dom v6 |
| Testing | Vitest, Testing Library, Storybook 8 |
| Lint / format | ESLint 9, (Prettier via Tailwind/ESLint) |

## Commands

```bash
# Install
npm install

# Development (port 8080)
npm run dev
# or
yarn dev

# Build
npm run build
# or
yarn build

# Preview production build
npm run preview

# Tests
npm run test
# or
yarn test

# Tests watch
yarn test:watch

# Lint
npm run lint
# or
yarn lint

# Storybook
yarn storybook
# Build Storybook
yarn build-storybook
```

## Entry points and main routes

- **Entry:** `src/main.tsx` → `App.tsx`
- **Root layout:** `App.tsx` wraps with `ThemeProvider`, `QueryClientProvider`, `SupabaseAuthProvider`, `ScreeningProvider`, `AgentProvider`, `TooltipProvider`, `RouterProvider`
- **Main routes:**
  - `/` — Index (landing)
  - `/dashboard`, `/cases`, `/cases/:id`, `/auth/login`, `/auth/signup`, `/profile`, `/reports`, `/settings` (under `MainLayout`)
  - `/telemetry` — Telemetry
  - `/clinician`, `/clinician/review` — Clinician dashboard and HITL review
  - `/pediscreen/*` — PediScreen flows (under `PediScreenLayout`):
    - `pediscreen/` — PediScreenHome
    - `pediscreen/screening` — **ScreeningScreen** (main capture flow)
    - `pediscreen/results` — **ResultsScreen**
    - `pediscreen/history` — ScreeningHistory
    - `pediscreen/voice` — VoiceInputScreen
    - `pediscreen/case/:id` — PediScreenCaseDetail
    - Plus: dashboard, agent-pipeline, profiles, settings, education, learn-more, radiology, technical-writer, end2end-demo, report/:reportId

## Key paths

| Purpose | Path |
|--------|------|
| App & routing | `src/App.tsx`, `src/main.tsx` |
| Theme / tokens | `src/theme/index.tsx`, `design/tokens.json`, `src/styles/tokens.ts`, `src/styles/theme.ts` |
| Pages (screens) | `src/pages/` |
| UI components | `src/components/ui/` (shadcn), `src/components/medgemma/`, `src/components/pediscreen/` |
| Services | `src/services/` (screeningApi, offlineQueue, embeddingService, captureService, auth, etc.) |
| API clients | `src/api/` (medgemma, consentApi, etc.) |
| Contexts | `src/contexts/` (ScreeningContext, AgentContext, SupabaseAuthContext) |
| i18n | `src/lib/i18n.ts`, `src/locales/en.json` |
| Storybook | `src/stories/`, component-level `*.stories.tsx` |

## Components to update (UX epic)

- **Theme:** Single source of truth for design tokens → `src/theme/design-tokens.ts` (or align `design/tokens.json` + `src/theme`).
- **Primitives:** Token-based Button, Card, Chip, Badge, Modal, Toast under `src/components/ui/` (or `src/components/ui/primitive/` to avoid clashing with shadcn).
- **Capture flow:** `src/pages/ScreeningScreen.tsx`, `src/components/pediscreen/ConsentModal.tsx`, `ImageUploadConsentModal.tsx`, `CapturePreviewStep.tsx`.
- **Consent:** `src/services/consentService.ts` (new), ConsentModal to use consent_id and store with localforage/localStorage.
- **Voice:** `src/components/voice/VoiceInput.tsx`, `src/pages/VoiceInputScreen.tsx`.
- **Embedding / results:** `src/services/embeddingService.ts`, `src/components/pediscreen/ExplainabilityPanel.tsx`, `src/pages/ResultsScreen.tsx`.
- **Offline / queue:** `src/services/offlineQueue.ts`, queue UI and sync (e.g. `QueueStatus.tsx`).
- **Clinician review:** `src/pages/ClinicianReviewWithCollab.tsx`, `src/components/pediscreen/ClinicianReview.tsx`, `ClinicianSignOff.tsx`, audit service.

## Known runtime issues & reproduction

*(To be filled when running dev and testing; document any console errors, failed API calls, or UI bugs here.)*

- Example: "When offline, screening submit shows X" → steps to reproduce.

## Notes

- Theme currently reads from `design/tokens.json` in `src/theme/index.tsx`; `src/styles/tokens.ts` is a separate token set (Tailwind-oriented).
- Consent is stored in `localStorage` under `pediscreen_consent_v1`; consent-first flow and `consent_id` for API calls are being added via `consentService`.
- Offline queue uses `idb` (IndexedDB) in `src/services/offlineQueue.ts`; sync on `online` in `App.tsx`.
