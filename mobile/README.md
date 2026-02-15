# PediScreen AI Mobile — HITL MedGemma Frontend

Clinically-validated **Human-in-the-Loop (HITL)** React Native app with Expo Router. MedGemma drafts screening recommendations; clinicians approve/edit in real-time via mobile dashboard with complete audit trails.

## Architecture

```
Voice/Text → MedGemma Draft → HITL Gate → Clinician Review → Final CDS
     ↓              ↓              ↓              ↓               ↓
AssemblyAI    QLoRA 4B-IT    APPROVE/EDIT/   Live Dashboard   FHIR Bundle
              REJECT Flow    + Notifications + Audit Log
```

## Features

- **Confidence-based routing** — Auto HITL when confidence < 85%
- **Real-time collaboration** — WebSocket clinician sync
- **Push notifications** — Expo instant HITL alerts
- **Role-based queues** — Clinician workload management
- **Audit compliance** — Complete decision trails
- **Multi-decision flow** — Approve / Edit / Reject / Escalate
- **Feedback loop** — Agent improvement scores

## Setup

```bash
cd mobile
npm install
```

**Assets:** Add `icon.png`, `splash-icon.png`, `adaptive-icon.png`, and `favicon.png` to `./assets/` for production. For quick start, you can use placeholder images or run `npx create-expo-app temp --template tabs` and copy its assets.

Add `.env` (optional):

```
EXPO_PUBLIC_API_URL=http://localhost:8000/api
EXPO_PUBLIC_WS_URL=ws://localhost:8000
EXPO_PUBLIC_API_KEY=your-api-key
```

## Run

```bash
npm start
# or
npm run ios
npm run android
```

## Backend

The mobile app expects these API endpoints:

- `POST /api/infer` — MedGemma inference
- `POST /api/hitl/audit` — Log audit events
- `POST /api/hitl/finalize` — Finalize case after clinician decision
- `GET /api/hitl/pending` — List pending HITL cases

When the backend is unavailable, the pipeline falls back to mock data and triggers HITL for demo.

## File Structure

```
mobile/
├── app/
│   ├── (auth)/          # Clinician / Parent login
│   ├── (tabs)/          # Dashboard, Pipeline, Review, Cases
│   └── hitl/[caseId]/   # HITL review screen
├── components/          # ClinicianDecisionButtons, AuditTrail, etc.
├── contexts/            # AuthProvider
├── hooks/               # useHitlOrchestrator, useHitlNotifications
├── lib/                 # API client
└── types/               # HITL types
```
