## PediScreen AI static demo

This folder contains a **self-contained, static PediScreen AI demo UI** designed for the MedGemma pediatric screening workflow.

- **Entry point**: `index.html`
- **Tech**: plain HTML/CSS/JS (no build step required)
- **Roles shown**: CHW screening input, MedGemma-style report, clinician review queue

### How to run the demo

- **Option 1 – Open directly**  
  Open `frontend/index.html` in any modern browser (Chrome, Edge, Safari, Firefox).  
  No server or build step is required.

- **Option 2 – Serve via a simple static server**  
  From the repo root, you can use any static file server you like, for example:

  ```bash
  npx serve frontend
  ```

  Then visit the printed local URL (for example `http://localhost:3000`) and open `index.html`.

> In some project setups there may also be an npm script such as `npm run start:demo` that serves this folder. If present in the root `package.json`, you can use that instead.

### Backend vs mock behavior

By default, the UI uses a **smart mock engine** that simulates responses from a MedGemma backend.

- The CHW form includes a **“Use backend API if available (fallback to smart mock)”** checkbox.
- When checked, the app will:
  - Attempt a `POST /api/analyze` call with `FormData` containing:
    - `childAge`
    - `domain`
    - `observations`
    - optional `image` (if an image was attached)
  - Expect a JSON response shaped like:

    ```json
    {
      "success": true,
      "screeningId": "PS-12345",
      "report": {
        "riskLevel": "low",
        "confidence": 0.87,
        "summary": "Short narrative",
        "keyFindings": ["..."],
        "recommendations": ["..."],
        "evidence": [
          { "type": "text", "content": "...", "influence": 0.8 }
        ]
      },
      "timestamp": 1739900000
    }
    ```

- If `/api/analyze` is not reachable or returns a non-2xx status:
  - The UI **automatically falls back** to its mock scenarios.
  - A small toast appears indicating that a mock is being used.

You can safely use this demo **without any backend running**; all core UX behavior is available via mocks.

### Safety and UX notes

- The UI is intentionally styled with **calm, clinical colors** and card-based layouts.
- A persistent disclaimer clarifies that this is **clinical decision support**, not a diagnostic device.
- Layout is **mobile-first** and adapts to larger screens with side-by-side CHW + results/clinician views.
