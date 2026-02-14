# PediScreen AI — Frontend UX Audit

**Date:** 2025-02-14  
**Environment:** Chrome 120+, Windows 10, 1920×1080  
**Auditor:** UI/UX Improvement Sprint

---

## Overview

This audit inventories current UI problems, missing states, and quick wins for the PediScreen AI front-end. Flows audited: Home → Capture (Screening) → Upload → Infer → Results → Clinician review.

---

## Heuristic Findings (Nielsen)

### 1. Visibility of System Status
- **P0:** No loading indicator during inference — user uncertainty about whether analysis is running or stuck.
- **P1:** Progress bar shows percentage but no step labels during multi-step flows.
- **P1:** No clear "Syncing" or "Offline" status in header; queue state is hidden.
- **P2:** Confidence indicator exists but lacks accessible tooltip explaining interpretation.

### 2. Match Between System & Real World
- **P1:** "MedGemma Density" and "Clinical Context" labels use technical jargon; parents may not understand.
- **P1:** "Embeddings-only" vs "raw image" not explained in parent-friendly terms on capture screen.
- **P2:** "LoRA adapter selection" in domain dropdown is developer-facing.

### 3. Error Prevention
- **P0:** Consent modal appears for general screening but **consent before raw image upload is missing** — privacy risk. User can upload images without explicit image-specific consent.
- **P1:** No confirmation before removing captured image; accidental tap could lose data.
- **P1:** No undo for drawing canvas (drawing capture not yet implemented).
- **P2:** Form validation messages could be more inline and contextual.

### 4. Recognition vs Recall
- **P1:** Suggested observation chips (e.g., "Few words", "Points to communicate") are missing — users must recall and type.
- **P1:** Age-aware prompts not implemented; same questions regardless of child age.
- **P2:** Domain selector requires recall of developmental domain names.

### 5. Flexibility & Efficiency
- **P1:** No quick-select for common observations; all input is free-text.
- **P1:** No voice input option for observations.
- **P2:** No keyboard shortcuts for power users (clinicians).

### 6. Aesthetic & Minimalist Design
- **P2:** Inconsistent spacing and typography across screens (some use rounded-xl, others rounded-lg).
- **P2:** Color palette varies (emerald/amber/red vs design tokens); RiskChip uses hardcoded colors.
- **P2:** Multiple badges and labels on single cards can feel cluttered.

### 7. Help & Documentation
- **P1:** No onboarding for first-time users.
- **P1:** Contextual help icons missing for complex fields (e.g., confidence interpretation).
- **P2:** "Learn more" exists but no inline tooltips.

### 8. Accessibility
- **P1:** Some buttons lack aria-label; icon-only buttons may not be announced.
- **P1:** Modal focus trap not verified for ConsentModal.
- **P2:** Heading structure (h1, h2) may skip levels on some pages.
- **P2:** Color contrast on muted text may not meet WCAG AA.

---

## Missing / Poor States

| State | Location | Issue |
|-------|----------|-------|
| **Loading** | Inference | No skeleton or determinate loader; user waits with no feedback |
| **Offline** | Global | No banner; queue icon missing; user may not know data is queued |
| **Empty** | History, Profiles | Empty states not designed |
| **Consent (image)** | Capture | Image-specific consent (embeddings vs raw) not shown before upload |
| **Error** | Submit, API | Generic toast; no retry CTA or link to help |
| **Slow network** | Inference | No timeout handler; no "continue in background" option |
| **Retake** | Capture | Remove exists but no explicit "Retake" flow; no preview step with Retake/Use |
| **Drawing** | Capture | Drawing canvas not implemented |
| **Voice** | Capture, Questionnaire | Voice input not implemented |

---

## Quick Wins (< 1 day each)

1. Add loading skeleton during inference (ScreeningScreen submit).
2. Add aria-labels to icon buttons (Camera, Upload, Remove).
3. Add "Retake" button alongside "Remove" on image preview.
4. Add offline banner when `navigator.onLine === false`.
5. Add consent modal for raw image upload before first image capture (embeddings vs raw).
6. Add 3–5 observation chips (e.g., "Few words", "Points to communicate", "Good eye contact").
7. Unify RiskChip to use design tokens.
8. Add focus trap to ConsentModal.

---

## Prioritized List

### P0 — Critical
- Consent missing before raw image upload (privacy risk).
- No loading indicator during inference (user uncertainty).

### P1 — Usability Friction
- Capture flow confusing; no ability to re-take photo with clear preview step.
- No undo for drawing (when implemented).
- No observation chips; all typing required.
- No voice input option.
- No onboarding for first-time users.
- No contextual help for confidence/evidence.
- Offline/queue status not visible.

### P2 — Visual Polish
- Inconsistent spacing, colors, typography.
- RiskChip and cards use hardcoded colors vs tokens.
- Accessibility: missing labels, focus traps, heading structure.

---

## Next Steps

1. Implement P0 items first (consent + loading).
2. Add preview step with Retake/Use for capture flow.
3. Expand design tokens and ensure components consume them.
4. Add Storybook stories for all core components.
5. Run axe and fix critical a11y violations.
