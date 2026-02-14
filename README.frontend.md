# PediScreen AI — Frontend Developer Guide

Quick reference for running, building, and contributing to the PediScreen AI frontend.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm ci
cp .env.example .env   # Edit .env with your API URLs
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_MODE` | `mock` \| `dev` \| `prod` — mock uses local fallback, no network |
| `VITE_MEDGEMMA_API_URL` | MedGemma API base URL (default: http://localhost:5000/api) |
| `VITE_PEDISCREEN_BACKEND_URL` | PediScreen FastAPI backend (optional) |
| `VITE_SUPABASE_URL` | Supabase project URL (optional) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (optional) |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run storybook` | Start Storybook (port 6006) |
| `npm run build-storybook` | Build static Storybook |

## Storybook

```bash
npm run storybook
```

Stories live in `src/components/**/*.stories.tsx`. Add new components with a `.stories.tsx` file.

## Adding New Components

1. Create component in `src/components/` (e.g. `Button/Button.tsx`)
2. Add `Button.stories.tsx` for Storybook
3. Add `Button.test.tsx` for unit tests
4. Use design tokens from `src/theme` or `design/tokens.json`

## PR Checklist

- [ ] Storybook screenshot or link attached
- [ ] Accessibility (axe) run on changed components
- [ ] Unit tests added/updated
- [ ] `npm run lint` passes
- [ ] `npm test` passes

## Project Structure

```
src/
  components/     # UI components (shadcn + medgemma)
  pages/          # Route pages
  services/       # API, offline queue, embedding
  api/            # inferClient (circuit-breaker), consent
  theme/          # Design tokens & ThemeProvider
  contexts/       # React contexts
design/
  tokens.json     # MedGemma design tokens
```

## Backend Integration

- **Embed**: `POST /embed` — image → embedding (see `embeddingService.ts`)
- **Infer**: `POST /infer` — embedding + metadata → screening result (see `api/inferClient.ts`)
- **Analyze**: `POST /api/analyze` — full screening (see `services/screeningApi.ts`)

See `MODEL_CARD.md` or backend docs for endpoint schemas.
