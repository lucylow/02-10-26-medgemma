# PR Checklist — UI/UX Improvements

Must pass before merge.

## Pre-merge checks

- [ ] Storybook stories updated for changed components
- [ ] Accessibility checks (axe) pass for core pages
- [ ] Unit tests pass: `npm run test`
- [ ] E2E tests pass (if applicable)
- [ ] Usability fixes from report implemented (when available)
- [ ] Demo video or Storybook snapshot included

## PR Template

```markdown
## Summary
What changed

## UX impact
List of UX changes and why

## How to test
1. npm ci
2. npm run dev
3. Open /pediscreen/screening and run through capture flow

## Accessibility
axe report attached (or link to Storybook a11y panel)

## Storybook
link: <storybook artifact>
```

## Core pages for axe

- Home (`/pediscreen`)
- Capture (`/pediscreen/screening`)
- Results (`/pediscreen/results`)
- Clinician Review (if applicable)
