# 3-minute demo script (mock data)

Use this with the mock server and demo mode to show capture → inference → clinician review → audit without a live model.

## Setup (before demo)

1. Generate mock data: `yarn gen:mock`
2. Start mock server: `node demo-server/index.js` (port 4002)
3. Start app in demo mode: `VITE_DEMO_MODE=true yarn dev` (or `yarn start:demo` if configured)
4. Optional: run `node scripts/seed_local_demo.js` to pre-populate `public/demo-cases.json` for "Load demo cases"

## Script (~3 minutes)

### 1. Landing (15 s)

- Open app; show PediScreen / developmental screening entry.
- If "Load demo cases" is available, click it to show preloaded cases (offline queue).

### 2. Capture (45 s)

- Start a new screening.
- Complete consent if the flow shows it.
- Enter child age (e.g. 24 months) and domain (e.g. Communication).
- Enter a short observation (e.g. "Says a few words, points to pictures").
- Optionally attach an image (placeholder/SVG is fine).
- Submit.

### 3. Inference & result (60 s)

- Show loading state (mock server adds configurable latency).
- Result screen: point out **risk level** (On Track / Monitor / Refer) and **parent-friendly text**.
- Open **Explainability** panel: show text and, if present, image_region or nearest_neighbor evidence.
- If **Evidence quality** or provenance is shown (data_quality / provenance), briefly note it (e.g. "synthetic demo" vs "pilot").
- Show **Clinician view** tab: summary bullets, recommendations, and any override/sign-off controls.

### 4. Audit / list (30 s)

- Go to screening history or case list.
- Show that cases appear with risk and thumbnails (mock thumbnails only — no real child photos).
- Optionally open one case to show full result and audit metadata.

### 5. Edge cases (optional, 30 s)

- Mention or show: missing age (prompt for age), invalid embedding (fallback message), large image (size limit / progress) using `case-missing-age`, `case-corrupt-embed`, `case-large-image` from mock server.

## Troubleshooting

- **No result**: Ensure demo-server is running and `VITE_DEMO_MODE=true`; check network tab for `/infer` to port 4002.
- **Timeout**: Use a case_id that exists; avoid `simulate: "timeout"` unless demonstrating timeout UX.
- **Spanish**: Use a Spanish case (e.g. `case-0001`–`case-0010` if generated with Spanish) and switch UI locale to es-ES if supported.
