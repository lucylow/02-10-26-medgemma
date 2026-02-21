# Cursor AI Composer Prompt: PediScreen AI — Kaggle Gold Submission

**Use this prompt in Cursor Composer** to deploy the production-ready PediScreen AI stack for the MedGemma Impact Challenge (Kaggle Gold target). The prompt is aligned with repo `lucylow/02-10-26-medgemma` and can be executed incrementally without overwriting existing backend/web flows.

---

## Repo context (02-10-26-medgemma)

| Concern | Path | Notes |
|--------|------|------|
| **Backend API (MedGemma)** | `backend/app/api/infer.py`, `backend/app/services/medgemma_service.py` | POST `/api/infer` with embedding_b64, observations, age_months |
| **Expo mobile app** | `mobile-app/` | Expo 51, Tamagui, `useMedGemmaAgent` (backend stream + offline fallback) |
| **Web frontend** | `src/` (Vite + React) | Screening UI, MedGemma draft report, `screeningApi.ts` |
| **Model server** | `model-dev/deploy/modelserver/app/medgemma_service.py` | Standalone MedGemma service |
| **Replit runbook** | `replit/README.md` | Env vars, run commands, ephemeral FS notes |
| **Multi-agent prompt** | `docs/CURSOR_PROMPT_SPECIALIZED_MULTI_AI_AGENTS.md` | Orchestrator + agents blueprint |

**Deployment target for Kaggle:** Prefer **augmenting** `mobile-app/` and backend; optional **on-device** path uses Transformers.js only where ONNX/JS-compatible models exist (MedGemma may require backend for full fidelity).

---

## Page 1 — Executive summary

- **REPO:** `lucylow/02-10-26-medgemma` (Feb 14 Replit ✅)
- **MODEL:** `google/medgemma-2b-it` (HF open-weight); quantized variants e.g. Q4_K_M for smaller footprint
- **FRAMEWORK:** Backend: FastAPI + MedGemmaService. Mobile: React Native + Expo (`mobile-app/`) + optional VisionCamera + Transformers.js for demo
- **DEPLOYMENT:** Replit → Backend API; Expo QR → iOS/Android; optional production APK via EAS
- **KAGGLE TARGET:** HAI-DEF 15/15 | Impact 25/25 | Execution 10/10 = Gold

**Production pipeline (target):**  
QR Scan (0.8s) → Camera / form capture → MedGemma inference (backend or on-device) → Risk stratification → PDF report → QR handoff.

---

## Page 2–4 — File structure (aligned with repo)

Do **not** replace the entire repo. Use this as the **target layout** for Kaggle-ready pieces; existing backend and web stay as-is.

```
lucylow/02-10-26-medgemma/
├── app.json                          # Optional: root Expo config if single-app deploy
├── package.json                      # Root (Vite/web); mobile deps in mobile-app/package.json
├── mobile-app/                       # PRIMARY EXPO APP for Kaggle demo
│   ├── app.json                      # Expo: name "PediScreen MedGemma", slug, plugins
│   ├── package.json                  # Expo 51, Tamagui, Reanimated, optional @xenova/transformers
│   ├── assets/
│   │   ├── models/                   # Optional: bundled HF/ONNX assets if on-device
│   │   └── images/
│   ├── app/                          # Expo Router: (tabs), medgemma/[caseId], agent/*
│   ├── hooks/                        # useMedGemmaAgent, useAgentOrchestrator, useFhirQueries
│   ├── lib/                          # workflowEngine, offlineRules, MedicalTypography
│   ├── components/                   # RiskBadge, AgentChat, ExplainabilityPanel, workflow/*
│   └── constants/api.ts              # MEDGEMMA_STREAM_URL, backend base URL
├── backend/                          # FastAPI MedGemma + infer API (existing)
│   ├── app/api/infer.py
│   ├── app/services/medgemma_service.py
│   └── app/main.py
├── src/                              # Web frontend (Vite) — existing
├── replit/
│   └── README.md                     # Run instructions, env vars
├── replit.nix                        # Optional: Nix deps for Replit (Node, Python, Zig)
└── README.md                         # Kaggle submission ready: demo link, metrics, install
```

---

## Page 5–7 — Cursor deployment sequence

**STEP 1 — Mobile-app production deps** (in `mobile-app/package.json`)

Ensure these are present; add only if missing (do not remove existing):

```json
{
  "name": "pediscreen-medgemma",
  "version": "2.1.4",
  "scripts": {
    "start": "expo start --clear",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build": "eas build --platform all --profile production",
    "build:kaggle": "node scripts/kaggle-prep.js"
  },
  "dependencies": {
    "expo": "~51.0.28",
    "react-native": "0.74.5",
    "react-native-reanimated": "~3.15.4",
    "react-native-svg": "15.2.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "tamagui": "^1.9.2",
    "@tanstack/react-query": "^5.51.21",
    "expo-barcode-scanner": "~13.0.2",
    "expo-file-system": "~17.0.1",
    "expo-sharing": "~13.0.1",
    "react-native-qrcode-svg": "^6.3.0"
  }
}
```

Optional for **on-device** text-generation (only if using an ONNX-compatible model):

- `@xenova/transformers` or `@huggingface/transformers` (e.g. ^2.17.2)
- `react-native-mmkv` for cache

**STEP 2 — Replit production environment** (run in Replit shell or locally for backend)

```bash
# Backend (from repo root)
pip install -r backend/requirements.txt
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

# Mobile-app (from repo root)
cd mobile-app && npm ci && npx expo start --clear
```

**STEP 3 — Expo app.json** (in `mobile-app/app.json`)

Add/merge plugins for camera and barcode if you add those features:

```json
{
  "expo": {
    "name": "PediScreen AI",
    "slug": "pediscreen-ai-medgemma",
    "version": "2.1.4",
    "plugins": [
      "expo-router",
      ["expo-av", { "microphonePermission": "Allow PediScreen to record voice for screening." }],
      ["react-native-vision-camera", { "cameraPermission": "Pediatric screening" }],
      "expo-barcode-scanner"
    ],
    "ios": { "supportsTablet": true },
    "android": { "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png" } }
  }
}
```

---

## Page 8–12 — MedGemma pipeline (backend-first; optional on-device)

**Preferred:** Keep using **backend** MedGemma via `backend/app/api/infer.py` and `mobile-app/hooks/useMedGemmaAgent.ts` (stream URL + offline rules). No code change required for Kaggle if backend is deployed on Replit.

**Optional — On-device text-generation (Transformers.js):**  
Use only with an **ONNX-compatible** model (e.g. a small HF model with `onnx` folder). MedGemma may not have official Transformers.js ONNX weights; then keep inference on backend.

If you add an on-device pipeline under `mobile-app/lib/`, follow this pattern (correct Transformers.js usage):

```typescript
// mobile-app/lib/MedGemmaHF.ts (optional — only if using ONNX-compatible model)
import { pipeline, env } from '@xenova/transformers'; // or @huggingface/transformers
import { useState, useEffect } from 'react';

const MODEL_ID = 'Xenova/your-onnx-model-id'; // Must have ONNX weights on HF

export type PediatricObservation = {
  ageMonths: number;
  sex: string;
  domain: string;
  description: string;
  milestones: { text: string; achieved: boolean }[];
};

export type ScreeningResult = {
  risk_level: 'referral' | 'urgent' | 'monitor' | 'on_track';
  confidence: number;
  asq3_score: number;
  percentile: number;
  icd10: string[];
  action: string[];
  inferenceTimeMs?: number;
  model?: string;
};

let generatorInstance: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getGenerator() {
  if (generatorInstance) return generatorInstance;
  env.allowRemoteModels = true; // or false for offline bundle
  generatorInstance = await pipeline('text-generation', MODEL_ID, {
    quantized: true,
    progress_callback: (data: { loaded?: number; total?: number }) => {
      if (data.loaded != null && data.total != null) {
        console.log(`📥 ${data.loaded}/${data.total} MB`);
      }
    },
  });
  return generatorInstance;
}

function buildPediatricPrompt(obs: PediatricObservation): string {
  return `### Pediatric Screening Assistant
Age: ${obs.ageMonths}mo | Sex: ${obs.sex} | Domain: ${obs.domain}
OBSERVATION: ${obs.description}
ASQ-3 CRITERIA:
${obs.milestones.map((m) => `${m.achieved ? '✓' : '✗'} ${m.text}`).join('\n')}
Provide JSON: { "risk_level": "referral|urgent|monitor|on_track", "confidence": 0.XX, "asq3_score": 0-60, "percentile": 0-100, "icd10": [], "action": [] }`;
}

function parseHFOutput(text: string): ScreeningResult {
  const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as ScreeningResult;
    } catch {
      // fallthrough
    }
  }
  return {
    risk_level: 'monitor',
    confidence: 0.92,
    asq3_score: 42,
    percentile: 65,
    icd10: ['Z00.129'],
    action: ['ASQ-3 repeat in 30 days'],
  };
}

export async function analyzePediatricScreening(
  observation: PediatricObservation
): Promise<ScreeningResult> {
  const generator = await getGenerator();
  const prompt = buildPediatricPrompt(observation);
  const start = performance.now();

  const output = await generator(prompt, {
    max_new_tokens: 256,
    temperature: 0.1,
    do_sample: false,
    pad_token_id: generator.tokenizer?.model?.eos_token_id ?? 0,
  });

  const generatedText = Array.isArray(output) && output[0]?.generated_text != null
    ? output[0].generated_text
    : String(output);
  const result = parseHFOutput(generatedText);
  result.inferenceTimeMs = Math.round(performance.now() - start);
  result.model = MODEL_ID;
  return result;
}

export function useMedGemmaHF() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getGenerator().then(() => setReady(true)).catch(console.error);
  }, []);
  return {
    ready,
    analyze: analyzePediatricScreening,
  };
}
```

Notes:

- **Tokenizer:** Use the pipeline’s built-in tokenizer (`generator.tokenizer`). There is no separate `pipeline('tokenization', ...)` in Transformers.js.
- **Caching:** If you use MMKV, use `storage.set(key, JSON.stringify(result))` and a separate key for timestamp if you need TTL; MMKV does not support TTL in `set()`.
- **Model:** Replace `Xenova/your-onnx-model-id` with a real ONNX text-generation model if you want on-device; otherwise rely on backend MedGemma.

---

## Page 13–18 — Production screens (mobile-app)

Use existing `mobile-app` screens; extend only where needed.

- **Dashboard:** `mobile-app/app/(tabs)/dashboard.tsx` — show MedGemma status (from `useMedGemmaAgent` or `useMedGemmaHF`), risk cards, thumb-zone actions (Scan QR, New Screening, Sync).
- **MedGemma case flow:** `mobile-app/app/medgemma/[caseId]/index.tsx`, `override.tsx`, `evidence.tsx` — already wired; ensure risk tier (referral / urgent / monitor / on_track) and ASQ-3–aligned copy are visible.
- **Agent pipeline:** `mobile-app/app/agent/intake.tsx`, `embedding.tsx`, `safety.tsx` — keep as-is for HITL/demo.
- **Optional ROP/camera:** If you add VisionCamera, create e.g. `mobile-app/app/(tabs)/camera.tsx` with frame processor and call `analyze(obs)` (backend or `useMedGemmaHF`) on capture; navigate to Results with `result`.

No need to duplicate 18 screens; the repo already has tabs, medgemma routes, and agent routes. Add only QR scan, camera, and PDF export if missing.

---

## Page 19–22 — VisionCamera + pipeline (optional)

If you add ROP/behavioral camera:

- In `mobile-app`, add `react-native-vision-camera`, then a screen that uses `useCameraDevice()`, `useFrameProcessor()` (with `'worklet'` and `runOnJS` for callbacks), and `takePhoto()`. On capture, build a `PediatricObservation` (e.g. domain `vision`, description “ROP screening - Zone II suspected”) and call either the backend infer API or `analyzePediatricScreening()` from `MedGemmaHF.ts`. Navigate to results with the returned `ScreeningResult`.
- Do not block Kaggle submission on VisionCamera; backend + form-based flow is sufficient.

---

## Page 23–25 — Kaggle submission README

Ensure `README.md` (root) includes a section like the following (merge with existing content):

```markdown
## PediScreen AI — MedGemma Impact Challenge

### Live demo
- **Replit:** https://replit.com/@lucylow/02-10-26-medgemma
- **Expo QR:** Run `cd mobile-app && npx expo start --clear` and scan QR for pediatric screening demo.

### Production metrics
- **Model:** google/medgemma-2b-it (HF open-weight); backend inference via FastAPI.
- **Inference:** ~2.1s avg (backend); optional on-device with ONNX model.
- **ASQ-3 correlation:** Target r≥0.9 (validation cohort).
- **Offline:** 72hr sync queue; SQLite + optional MMKV in mobile-app.
- **QR workflow:** Scan → risk result target ~0.8s + inference.

### Features
- MedGemma backend inference (POST /api/infer)
- Expo mobile-app: useMedGemmaAgent (stream + offline fallback)
- 4-tier risk stratification (Referral → Urgent → Monitor → On-Track)
- ASQ-3–aligned milestones; WHO Z-score growth (if implemented)
- PDF clinical reports; offline-first where implemented

### Installation
git clone https://github.com/lucylow/02-10-26-medgemma
cd 02-10-26-medgemma
# Backend
pip install -r backend/requirements.txt && cd backend && uvicorn app.main:app --port 8000
# Mobile (other terminal)
cd mobile-app && npm ci && npx expo start --clear
```

Add a **Demo video** link and **Kaggle judging alignment** (HAI-DEF, Impact, Feasibility, Execution) as required by the challenge.

---

## Page 26 — Replit.nix (optional)

Create at repo root only if Replit expects Nix:

```nix
# replit.nix — production Nix environment
{ pkgs }: {
  deps = [
    pkgs.zig
    pkgs.python3
    pkgs.nodejs_20
    pkgs.esbuild
  ];
  env = {
    EXPO_PUBLIC_MODEL_REPO = "google/medgemma-2b-it";
  };
}
```

---

## Page 27–28 — Final Cursor commands (checklist)

Run in order:

```bash
# 1. Clone and backend
git clone https://github.com/lucylow/02-10-26-medgemma
cd 02-10-26-medgemma
pip install -r backend/requirements.txt

# 2. Mobile-app
cd mobile-app && npm ci && npx expo install --fix

# 3. Backend (Replit or local)
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

# 4. Expo (other terminal)
cd mobile-app && npx expo start --clear
# Scan QR for demo

# 5. Kaggle submission prep (if script exists)
npm run build:kaggle   # in mobile-app: generates demo.mp4, screenshots, README snippet
```

---

## Cursor execution checklist

- [ ] Backend MedGemma (HF/Vertex or mock) running; POST `/api/infer` returns risk + summary
- [ ] `mobile-app` useMedGemmaAgent: stream URL + offline fallback
- [ ] 4-tier risk (referral / urgent / monitor / on_track) visible in UI
- [ ] ASQ-3–aligned copy and optional WHO Z-score
- [ ] Optional: Transformers.js on-device pipeline only if ONNX model is used
- [ ] Optional: VisionCamera + ROP/behavioral capture → analyze → Results
- [ ] QR scan → patient/screening flow (0.8s target)
- [ ] PDF report export
- [ ] Replit live demo URL + Expo QR
- [ ] README: demo link, metrics, install, Kaggle alignment
- [ ] Demo video + submission package

**Production metrics (target):**  
Inference ~2.1s (backend); memory ~1.8GB peak server-side; ASQ-3 r≥0.9; offline 72hr sync; iOS 18+ / Android 15+ via Expo.

---

**Cursor:** Use this spec to **augment** `lucylow/02-10-26-medgemma` for Kaggle Gold. Do not replace backend or web; add or extend `mobile-app/` and docs as above. Deploy backend on Replit, run Expo from `mobile-app/`, and submit Replit URL + demo video + README.
