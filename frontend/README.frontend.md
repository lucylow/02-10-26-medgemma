# PediScreen AI — Frontend Development

React + Vite + TypeScript front-end for PediScreen AI.

---

## Setup

```bash
npm ci
npm run dev
```

Runs at http://localhost:5173 (or next available port).

---

## Storybook

```bash
npm run storybook
```

Stories for: Button, Card, RiskChip, and other MedGemma components. Includes `@storybook/addon-a11y` for accessibility checks.

---

## Tests

```bash
npm run test
npm run test:watch
```

---

## Key Paths

- `src/pages/` — screens (PediScreenHome, ScreeningScreen, ResultsScreen, etc.)
- `src/components/pediscreen/` — PediScreen-specific components
- `src/components/medgemma/` — design-system components
- `design/tokens.json` — design tokens
- `src/theme/` — ThemeProvider, ThemeContext

---

## PediScreen Routes

- `/pediscreen` — Home
- `/pediscreen/screening` — Capture & questionnaire
- `/pediscreen/results` — Results (caregiver + clinician views)
- `/pediscreen/history` — Screening history
- `/pediscreen/settings` — Settings
- `/pediscreen/education` — Education
- `/pediscreen/learn-more` — Learn more
