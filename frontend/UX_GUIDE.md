# PediScreen AI — Frontend UX Guide

Design system, flows, and UX patterns for the PediScreen AI front-end.

---

## Personas

See [personas.md](./personas.md) for:
- **Amina** (CHW) — rural clinic, low connectivity, needs offline capture
- **Luis** (Parent) — worried about speech, prefers voice input
- **Dr. Chen** (Clinician) — reviews reports, edits, signs, exports to EHR

---

## User Journeys

See [user_journeys.md](./user_journeys.md) for:
1. CHW visit → capture → monitor → sync later
2. Parent at home → voice concern → parent guidance
3. Clinician review → edit → sign → export

---

## Design Tokens

Location: `design/tokens.json`

### Colors (MedGemma palette)
- `primary`: #1A73E8
- `accent`: #00BCD4
- `success`: #34A853
- `warning`: #FBBC05
- `danger`: #EA4335
- `text`: #202124
- `muted`: #5F6368
- `surface`: #F8F9FA
- `card`: #FFFFFF
- `divider`: #E8EAED

### Radii
- sm: 8px, md: 12px, lg: 20px

### Spacing
- xs: 4, sm: 8, md: 16, lg: 24, xl: 32

### Typography
- h1: 40px, h2: 28px, body: 18px, small: 14px

---

## Components

- **RiskChip** — low / monitor / refer (uses tokens)
- **Button, Card** — MedGemma-themed
- **ImageUploadConsentModal** — consent before raw image upload
- **CapturePreviewStep** — Retake / Use Image after capture
- **ConsentModal** — general screening consent

---

## Consent Flow

1. **General consent** — shown on first visit (ConsentModal)
2. **Image consent** — shown before first image capture (ImageUploadConsentModal)
   - "Use embeddings only (recommended)" — default, keeps images private
   - "Upload raw image (consent)" — explicit consent for raw upload
3. Per-case consent recorded in case metadata when raw image chosen

---

## Offline Behavior

- Offline banner when `navigator.onLine === false`
- Queue icon in header shows unsynced count
- Case status: Pending / Syncing / Synced / Failed
- Manual sync in Settings; per-case Retry
- IndexedDB queue; auto-sync on reconnect

---

## Accessibility

- WCAG AA target
- axe addon in Storybook
- Focus traps for modals
- aria-labels on icon buttons
- Keyboard navigation for primary flows

---

## Analytics (Opt-in)

Events: `screen_view`, `capture_started`, `capture_completed`, `consent_given`, `infer_request`, `infer_response`, `clinician_signoff`.

Controlled in Settings; respects GDPR opt-in.
