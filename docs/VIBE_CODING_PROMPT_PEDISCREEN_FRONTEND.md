# PediScreen AI Frontend — 15-Page Vibe Coding Prompt

**Production Medical AI Agent UI for MedGemma Impact Challenge (Kaggle)**  
**Repository:** https://github.com/lucylow/02-10-26-medgemma

---

## Page 1 — Executive Summary & Vision

You are building a **production-grade medical screening frontend** for PediScreen AI. The goal is to transform the existing Vite + React + Tailwind codebase into a **clinician/parent dual-mode interface** that seamlessly integrates the memory-enhanced multi-agent orchestrator and screams "I understand clinical UX + AI agent integration" to hackathon judges.

### Current Stack (Web)
- **Framework:** Vite + React 18
- **Styling:** Tailwind CSS + Radix UI (shadcn components)
- **State:** TanStack Query, ScreeningContext
- **Auth:** Supabase
- **Routing:** React Router v6

### Target Outcomes
1. **Medical-grade UI** — Trustworthy colors, Inter font, 12px radius
2. **Dual-mode** — Clinician (evidence chains, agent pipeline) vs Parent (simple summaries, next steps)
3. **Agent transparency** — Full pipeline: Intake → Embedding → Temporal → MedGemma → Safety
4. **Real-time state** — TanStack Query + optimistic updates
5. **Production auth** — Role-based views (clinician vs parent)
6. **Performance** — Optimized rendering, offline-first where possible
7. **Kaggle judge impact** — Clear differentiation from generic AI UIs

### Vibe
- **Trustworthy, not playful** — Medical blue, clean surfaces, no cartoonish elements
- **Evidence-first** — Show the AI pipeline, not black-box magic
- **Accessible** — WCAG 2.1 AA, read-aloud, high contrast
- **FDA-aligned** — Decision support language, no diagnostic claims

---

## Page 2 — Design System: Medical Blue + Trust Signals

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#1E3A8A` | Medical Blue — headers, CTAs, trust |
| **Primary Alt** | `#0EA5E9` | Trust Blue — links, highlights |
| **Success** | `#10B981` | Growth Green — low risk, completed |
| **Warning** | `#F59E0B` | Alert Amber — monitor, caution |
| **Error** | `#EF4444` | Critical Red — refer, safety violations |
| **Safe** | `#86EFAC` | Safe Green — on-track indicators |
| **Surface** | `#F8FAFC` | Clean White — cards, backgrounds |
| **Surface Alt** | `#E2E8F0` | Soft Gray — secondary surfaces |
| **Border** | `#CBD5E1` | Subtle border |
| **Text** | `#1E293B` | Dark text |

### Typography
- **Font:** Inter (medical-grade readability)
- **Fallback:** `"Inter", "Segoe UI", system-ui, sans-serif`
- **Sizes:** xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (30px), 4xl (36px)

### Spacing Scale (4px base)
`4, 8, 12, 16, 20, 24, 32, 40, 48`

### Border Radius
- **Default:** 12px (trustworthy, not playful)
- **Small:** 8px
- **Large:** 16px

### Tailwind Config Update

```js
// tailwind.config.ts — extend theme
theme: {
  extend: {
    colors: {
      medical: {
        primary: '#1E3A8A',
        primaryAlt: '#0EA5E9',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        safe: '#86EFAC',
        surface: '#F8FAFC',
        surfaceAlt: '#E2E8F0',
      },
    },
    fontFamily: {
      sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
    },
    borderRadius: {
      'medical': '12px',
    },
  },
},
```

### Update `design/tokens.json` and `src/styles/tokens.ts`

Align existing tokens with the medical palette above. Replace `#1A73E8` with `#1E3A8A` for primary.

---

## Page 3 — App Structure & Routing

### Current Structure (Preserve & Enhance)

```
src/
├── App.tsx                    # Root layout, providers
├── main.tsx
├── components/
│   ├── ui/                    # shadcn components
│   ├── pediscreen/            # PediScreen-specific
│   ├── layout/                # MainLayout, NavBar, Sidebar
│   └── medgemma/              # RiskChip, Card, Button
├── pages/
│   ├── Index.tsx              # Landing
│   ├── PediScreenHome.tsx     # Dashboard
│   ├── ScreeningScreen.tsx    # Main screening flow
│   ├── ResultsScreen.tsx      # Report view
│   ├── ScreeningHistory.tsx   # Case history
│   ├── cases/
│   │   ├── CasesIndex.tsx     # List cases
│   │   └── CaseDetail.tsx     # Case detail + agent chat
│   └── auth/
├── services/
│   ├── screeningApi.ts        # submitScreening, listScreenings, getScreening
│   └── cases.ts
├── contexts/
│   └── ScreeningContext.tsx
├── styles/
│   ├── tokens.ts
│   └── theme.ts
└── lib/
```

### Route Map

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Index | Landing |
| `/pediscreen` | PediScreenHome | Dashboard + recent cases |
| `/pediscreen/screening` | ScreeningScreen | Screening workflow |
| `/pediscreen/results` | ResultsScreen | Report (caregiver/clinician view) |
| `/pediscreen/history` | ScreeningHistory | Case history + trends |
| `/pediscreen/profiles` | Profiles | Child profiles |
| `/cases` | CasesIndex | All cases (clinician) |
| `/cases/:id` | CaseDetail | Case detail + agent pipeline |

### Add Case Detail Route for PediScreen

Ensure `/pediscreen/report/:id` or `/pediscreen/case/:id` routes to a case detail view that shows the full agent pipeline (Intake → MedSigLIP → Temporal → MedGemma → Safety).

---

## Page 4 — Root Layout & Providers

### App.tsx Enhancements

1. **QueryClient** — Add `staleTime: 5 * 60 * 1000` (5 min) for cases
2. **ThemeProvider** — Ensure medical palette is applied
3. **Auth** — Use `user.publicMetadata.role` for clinician vs parent
4. **Offline** — Keep existing `flush` on `online` for offline queue

### Provider Order

```tsx
<ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <SupabaseAuthProvider>
      <TooltipProvider>
        <ScreeningProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} />
        </ScreeningProvider>
      </TooltipProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
</ThemeProvider>
```

### ThemeProvider Update

In `src/theme/index.tsx`, ensure CSS variables map to medical palette:

```css
:root {
  --primary: 222 47% 25%;        /* #1E3A8A */
  --primary-foreground: 210 40% 98%;
  --accent: 199 89% 48%;         /* #0EA5E9 */
  --success: 160 84% 39%;        /* #10B981 */
  --warning: 38 92% 50%;         /* #F59E0B */
  --destructive: 0 84% 60%;     /* #EF4444 */
}
```

---

## Page 5 — API Client & Hooks

### Extend `screeningApi.ts`

Add support for memory-enhanced backend (`/process_case_with_memory`):

```ts
// New type for memory-enhanced request
export type ProcessCaseRequest = {
  case_id?: string;
  child_age_months: number;
  domain: 'language' | 'motor' | 'social' | 'cognitive' | string;
  observations: string;
  image_b64?: string;
  child_id?: string;
};

// New type for memory-enhanced report
export type ScreeningReportWithMemory = ScreeningResult & {
  memory_used?: boolean;
  temporal?: { stability?: string };
  medgemma?: { summary?: string; next_steps?: string[] };
  safety?: { ok: boolean; violations?: string[] };
};
```

### TanStack Query Hooks

Create `src/hooks/useCases.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listScreenings, getScreening, submitScreening } from '@/services/screeningApi';

export const useCases = (childId?: string) => {
  return useQuery({
    queryKey: ['cases', childId],
    queryFn: () => listScreenings({ limit: 50 }).then(r => r.items),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCase = (id: string | undefined) => {
  return useQuery({
    queryKey: ['case', id],
    queryFn: () => getScreening(id!),
    enabled: !!id,
  });
};
```

### FormData for Memory Backend

When `VITE_PEDISCREEN_BACKEND_URL` points to memory-enabled backend:

```ts
const form = new FormData();
form.append('child_age_months', String(parseInt(request.childAge)));
form.append('domain', request.domain);
form.append('observations', request.observations);
if (request.imageFile) {
  const b64 = await fileToBase64(request.imageFile);
  form.append('image_b64', b64);
}
```

---

## Page 6 — Screening Screen Flow

### Step-Based Workflow

1. **Age** — Child age (months), quick-select 12–72
2. **Domain** — Language, Motor, Social, Cognitive
3. **Observations** — Text/voice/image input
4. **Image** (optional) — Drawing upload for MedSigLIP
5. **Processing** — Show agent pipeline progress

### Progress Bar

```tsx
const steps = ['age', 'domain', 'observations', 'image', 'processing'];
const progress = (steps.indexOf(step) + 1) / steps.length;
<Progress value={progress * 100} className="h-2" />
```

### Domain Selector

Use `lib/constants.ts` domains:

```ts
export const domains = [
  { id: 'language', title: 'Language', icon: '💬', color: '#3B82F6' },
  { id: 'motor', title: 'Motor Skills', icon: '✋', color: '#10B981' },
  { id: 'social', title: 'Social', icon: '👥', color: '#F59E0B' },
  { id: 'cognitive', title: 'Cognitive', icon: '🧠', color: '#8B5CF6' },
];
```

### Processing State

Show agent pipeline stages:

```tsx
<div className="flex flex-col items-center gap-4 py-8">
  <Loader2 className="w-12 h-12 animate-spin text-medical-primary" />
  <p className="font-semibold">AI Agents Analyzing...</p>
  <p className="text-sm text-muted-foreground">
    Intake → Embedding → Temporal → MedGemma → Safety
  </p>
</div>
```

### Image Picker Fix

User prompt had typo `aspect:,[11]` — use:

```ts
// For web: standard file input
// For React Native (future): aspect: [1, 1]
```

---

## Page 7 — Case Detail & Agent Pipeline

### CaseDetail.tsx Overhaul

Transform from minimal card to full agent-transparent view.

### RiskPill Component

```tsx
const RiskPill = ({ level, confidence }: { level: string; confidence?: number }) => {
  const config = {
    low: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    on_track: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    monitor: { bg: 'bg-amber-100', text: 'text-amber-800' },
    elevated: { bg: 'bg-amber-200', text: 'text-amber-900' },
    refer: { bg: 'bg-red-100', text: 'text-red-800' },
    high: { bg: 'bg-red-100', text: 'text-red-800' },
  }[level?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  return (
    <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', config.bg, config.text)}>
      {level?.toUpperCase()} {confidence != null && `(${Math.round(confidence * 100)}%)`}
    </span>
  );
};
```

### Agent Pipeline Section (Clinician View)

```tsx
<div className="space-y-3">
  <h3 className="font-bold text-medical-primary flex items-center gap-2">
    🤖 AI Agent Pipeline
  </h3>
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Shield className="w-5 h-5 text-medical-success" />
      <span>Intake Agent: Validated inputs</span>
    </div>
    <div className="flex items-center gap-2">
      <Brain className="w-5 h-5 text-medical-primary" />
      <span>MedSigLIP: Analyzed drawing</span>
    </div>
    <div className="flex items-center gap-2">
      <History className="w-5 h-5 text-medical-warning" />
      <span>Temporal Agent: {caseData.temporal?.stability || 'No history'}</span>
    </div>
    {caseData.memory_used && (
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-violet-500" />
        <span>Memory Enhanced: Used case history</span>
      </div>
    )}
  </div>
</div>
```

### Role Toggle

```tsx
const [role, setRole] = useState<'clinician' | 'parent'>('parent');
const isClinician = user?.publicMetadata?.role === 'clinician' || role === 'clinician';

// Show evidence chain only for clinician
{isClinician && renderEvidenceChain()}
```

### Safety Status Card

```tsx
<Card className={caseData.safety?.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
  <CardContent className="flex items-center gap-3 py-4">
    {caseData.safety?.ok ? (
      <Shield className="w-6 h-6 text-emerald-600" />
    ) : (
      <AlertTriangle className="w-6 h-6 text-red-600" />
    )}
    <div>
      <p className="font-semibold">{caseData.safety?.ok ? 'Safety Check: PASSED' : 'Safety Check: REVIEW REQUIRED'}</p>
      {!caseData.safety?.ok && (
        <p className="text-sm text-red-700">{caseData.safety?.violations?.join(', ') || 'Safety violation detected'}</p>
      )}
    </div>
  </CardContent>
</Card>
```

### Fix Typos from User Prompt

- `caseData.medgemma?.summary?.` → `caseData.medgemma?.summary ?? caseData.report?.summary`
- `caseData.safety.violations?.` → `caseData.safety?.violations?.join(', ')`

---

## Page 8 — Dashboard Home (PediScreenHome)

### Stats Cards

```tsx
const stats = {
  total: cases?.length ?? 0,
  lowRisk: cases?.filter(c => ['low', 'on_track'].includes(c.report?.riskLevel?.toLowerCase())).length ?? 0,
  needsReview: cases?.filter(c => !['low', 'on_track'].includes(c.report?.riskLevel?.toLowerCase())).length ?? 0,
};

<Card className="bg-medical-primary text-white">
  <CardContent className="flex items-center gap-4 py-6">
    <Activity className="w-10 h-10" />
    <div>
      <p className="text-3xl font-bold">{stats.total}</p>
      <p className="text-sm opacity-90">Screenings</p>
    </div>
  </CardContent>
</Card>
```

### Recent Cases

Use `RiskPill` for each case. Link to `/pediscreen/report/:id` or `/cases/:id`.

### Quick Actions

- **New Screening** → `/pediscreen/screening`
- **View History** → `/pediscreen/history`

---

## Page 9 — Domain Constants & Types

### `src/lib/constants.ts`

```ts
export const domains = [
  { id: 'language', title: 'Language', icon: '💬', color: '#3B82F6', description: 'Speech, words, communication' },
  { id: 'motor', title: 'Motor Skills', icon: '✋', color: '#10B981', description: 'Movement, coordination, drawing' },
  { id: 'social', title: 'Social', icon: '👥', color: '#F59E0B', description: 'Eye contact, play, interaction' },
  { id: 'cognitive', title: 'Cognitive', icon: '🧠', color: '#8B5CF6', description: 'Problem solving, attention' },
];

// Map to existing API domains
export const domainToApi = {
  language: 'communication',
  motor: 'fine_motor', // or gross_motor
  social: 'social',
  cognitive: 'cognitive',
};
```

### TypeScript Types

```ts
export type RiskLevel = 'low' | 'on_track' | 'monitor' | 'elevated' | 'refer' | 'high' | 'unknown';

export interface ScreeningReport {
  case_id?: string;
  risk_level: RiskLevel;
  confidence?: number;
  evidence?: Array<{ type: string; content: unknown; influence?: number; source_model?: string }>;
  temporal?: { stability?: string };
  medgemma?: { summary?: string; next_steps?: string[] };
  safety?: { ok: boolean; violations?: string[] };
  memory_used?: boolean;
}
```

---

## Page 10 — Shared Components

### ProgressBar

Use existing `@/components/ui/progress`. Ensure it supports `color` prop for medical primary.

### RiskPill

Extract to `@/components/pediscreen/RiskPill.tsx` and reuse in:
- CaseDetail
- PediScreenHome (recent cases)
- ResultsScreen
- CasesIndex

### AgentPipelineCard

New component: `@/components/pediscreen/AgentPipelineCard.tsx`

Props: `agents: { name, status, icon }[]`

### NextStepsCard

For parent view: render `medgemma?.next_steps` as checklist with green checkmarks.

---

## Page 11 — Results Screen Enhancements

### Caregiver vs Clinician Tabs

Already present. Ensure:
- **Caregiver:** Parent-friendly language, next steps, emotional support
- **Clinician:** Raw risk level, evidence chain, model evidence, EHR copy-paste

### Add Agent Pipeline (when data available)

If `report.modelEvidence` or backend returns `temporal`, `memory_used`:

```tsx
{report.memory_used && (
  <Badge variant="outline" className="gap-1">
    <Target className="w-3 h-3" />
    Memory Enhanced
  </Badge>
)}
```

### Confidence Indicator

Keep existing `ConfidenceIndicator`. Style with medical colors.

---

## Page 12 — Accessibility & Performance

### Accessibility

1. **Read-aloud** — Keep `AccessibilityBar` with `readAloudTarget`
2. **Focus order** — Logical tab order in screening flow
3. **ARIA** — `aria-label` on icon buttons, `role="status"` for loading
4. **Color contrast** — Ensure 4.5:1 for text, 3:1 for large text

### Performance

1. **TanStack Query** — `staleTime` 2–5 min for cases
2. **Lazy load** — `React.lazy` for heavy pages (Radiology, Technical Writer)
3. **Image optimization** — Compress before upload, use `loading="lazy"`
4. **Offline** — Keep `offlineQueue` + `flush` on `online`

### Error Boundaries

Wrap PediScreen routes in error boundary with fallback UI.

---

## Page 13 — Deployment & Kaggle Impact

### Build Commands

```bash
npm install
npm run build
npm run preview  # Test production build
```

### Environment Variables

```
VITE_PEDISCREEN_BACKEND_URL=https://your-api.example.com
VITE_API_KEY=your-api-key
VITE_SUPABASE_FUNCTION_URL=  # Optional
```

### Kaggle Judge Checklist

| Criterion | Implementation |
|-----------|----------------|
| Medical-grade UI | Medical blue (#1E3A8A), Inter font, 12px radius |
| Dual-mode | Clinician (evidence) vs Parent (summary) |
| Agent transparency | Pipeline: Intake → MedGemma → Safety |
| Real-time state | TanStack Query, optimistic updates |
| Production auth | Role-based views via Supabase |
| Performance | Query caching, lazy load |
| Offline-first | AsyncStorage + retry on reconnect |

---

## Page 14 — Implementation Checklist

### Phase 1: Design System
- [ ] Update `tailwind.config.ts` with medical palette
- [ ] Update `design/tokens.json` and `src/styles/tokens.ts`
- [ ] Update `ThemeProvider` CSS variables
- [ ] Add Inter font (Google Fonts or local)

### Phase 2: Components
- [ ] Create `RiskPill` component
- [ ] Create `AgentPipelineCard` component
- [ ] Add `useCases` and `useCase` hooks
- [ ] Add `domains` constant and `domainToApi` map

### Phase 3: Screening Flow
- [ ] Add step-based progress (age → domain → observations → image → processing)
- [ ] Add processing state with agent pipeline text
- [ ] Fix domain selector to use new constants

### Phase 4: Case Detail
- [ ] Overhaul CaseDetail with RiskPill, Agent Pipeline, Safety card
- [ ] Add role toggle (clinician/parent)
- [ ] Add Next Steps section for parent view
- [ ] Handle `temporal`, `memory_used`, `safety` from API

### Phase 5: Dashboard
- [ ] Add stats cards (total, low risk, needs review)
- [ ] Add recent cases with RiskPill
- [ ] Add quick actions (New Screening, View History)

### Phase 6: Polish
- [ ] Ensure ResultsScreen shows agent badges when data available
- [ ] Add lazy loading for heavy routes
- [ ] Verify accessibility (focus, ARIA, contrast)

---

## Page 15 — Code Snippets (Copy-Paste Ready)

### RiskPill.tsx

```tsx
import { cn } from '@/lib/utils';

const config: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  on_track: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  monitor: { bg: 'bg-amber-100', text: 'text-amber-800' },
  elevated: { bg: 'bg-amber-200', text: 'text-amber-900' },
  refer: { bg: 'bg-red-100', text: 'text-red-800' },
  high: { bg: 'bg-red-100', text: 'text-red-800' },
};

export function RiskPill({ level, confidence }: { level?: string; confidence?: number }) {
  const c = config[level?.toLowerCase() ?? ''] ?? { bg: 'bg-gray-100', text: 'text-gray-800' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold', c.bg, c.text)}>
      {(level ?? 'Unknown').toUpperCase()}
      {confidence != null && <span className="opacity-80">({Math.round(confidence * 100)}%)</span>}
    </span>
  );
}
```

### AgentPipelineCard.tsx

```tsx
import { Shield, Brain, History, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const icons = { Shield, Brain, History, Target };

export function AgentPipelineCard({
  agents = [
    { name: 'Intake Agent', status: 'Validated inputs', icon: 'Shield', color: 'text-emerald-600' },
    { name: 'MedSigLIP', status: 'Analyzed drawing', icon: 'Brain', color: 'text-medical-primary' },
    { name: 'Temporal Agent', status: 'No history', icon: 'History', color: 'text-amber-600' },
    { name: 'Memory', status: 'Used case history', icon: 'Target', color: 'text-violet-500', show: false },
  ],
  memoryUsed,
}: {
  agents?: Array<{ name: string; status: string; icon: keyof typeof icons; color: string; show?: boolean }>;
  memoryUsed?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">🤖 AI Agent Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {agents
          .filter(a => a.show !== false && (a.name !== 'Memory' || memoryUsed))
          .map((a, i) => {
            const Icon = icons[a.icon];
            return (
              <div key={i} className="flex items-center gap-2">
                <Icon className={cn('w-5 h-5', a.color)} />
                <span className="text-sm">{a.name}: {a.status}</span>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
```

### tailwind.config.ts (extend)

```ts
colors: {
  medical: {
    primary: '#1E3A8A',
    primaryAlt: '#0EA5E9',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    safe: '#86EFAC',
    surface: '#F8FAFC',
    surfaceAlt: '#E2E8F0',
  },
},
```

---

## Appendix A — Backend API Contract (Memory-Enhanced)

When backend supports `/process_case_with_memory`:

**Request (FormData):**
- `child_age_months`: number
- `domain`: string
- `observations`: string
- `image_b64`: optional base64 string
- `child_id`: optional string

**Response:**
```json
{
  "case_id": "uuid",
  "risk_level": "low|monitor|elevated|discuss",
  "confidence": 0.85,
  "evidence": [...],
  "temporal": { "stability": "..." },
  "medgemma": { "summary": "...", "next_steps": ["..."] },
  "safety": { "ok": true, "violations": [] },
  "memory_used": true
}
```

---

## Appendix B — React Native / Expo (Future)

If migrating to React Native for mobile:

- Replace `react-router-dom` with `expo-router`
- Replace Radix/shadcn with Tamagui or NativeWind
- Replace `fetch` with same API client (works in RN)
- Use `expo-image-picker` for `aspect: [1, 1]`
- Use Clerk or Supabase for auth (both support RN)

---

**End of Document**

*Copy to Cursor → @workspace /app → "Implement PediScreen AI Frontend per VIBE_CODING_PROMPT"*
