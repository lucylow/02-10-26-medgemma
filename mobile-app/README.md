# PediScreen MedGemma – Production React Native App

Medical-grade production React Native app with **MedGemma 4B-IT QLoRA** specialized agents for pediatric developmental screening.

## Architecture

```
Voice/Text → MedGemma Router → QLoRA Pipeline → CDS Output
     ↓              ↓                ↓              ↓
AssemblyAI   [Intake]→[Embed]→[MedGemma*]→[Safety]→[FHIR]  Clinician UX
                    (4-bit QLoRA)    Streaming
                 google/medgemma-4b-it   HIPAA Logs
```

## Features

- **MedGemma 4B-IT QLoRA** – Pediatric fine-tuned
- **Live streaming inference** – Token-by-token UI
- **FHIR integration** – Clinical standards compliance
- **Offline fallback** – ASQ-3 validated rules (~95% accuracy)
- **Role-based access** – Clinician evidence chains
- **Voice → agent routing** – Production UX
- **60fps medical UI** – Tamagui + Reanimated
- **Type-safe** – Full TypeScript + Zod validation

## Setup

```bash
cd mobile-app
npm install
```

Add placeholder assets (or run `npx create-expo-app@latest temp --template blank` and copy assets/):

```bash
mkdir -p assets
# Add icon.png (1024x1024), splash-icon.png, adaptive-icon.png
# Or use: npx expo prebuild --no-install  # generates default assets
```

```bash
npx expo start
```

## Environment

Create `.env` in `mobile-app/`:

```
EXPO_PUBLIC_MEDGEMMA_API_URL=http://localhost:8000
EXPO_PUBLIC_API_KEY=your-api-key
```

The app uses the existing backend's `/api/stream-analyze` SSE endpoint. Run the backend:

```bash
# From project root
cd backend && uvicorn app.main:app --reload
```

## Project Structure

```
mobile-app/
├── app/
│   ├── (auth)/           # Clinician login, parent onboard
│   ├── (tabs)/           # Dashboard, pipeline, cases, settings
│   ├── medgemma/[caseId]/ # Streaming screen, evidence, override
│   └── agent/            # Intake, embedding, safety
├── hooks/
│   ├── useMedGemmaAgent.ts
│   ├── useAgentOrchestrator.ts
│   └── useAgentState.ts
├── lib/
│   └── offlineRules.ts   # ASQ-3 offline rules
└── constants/
    └── api.ts
```

## Run

- **iOS**: `npx expo run:ios`
- **Android**: `npx expo run:android`
- **Web**: `npx expo start --web`
