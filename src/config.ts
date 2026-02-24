/**
 * Demo mode and API URLs for PediScreen.
 * When VITE_DEMO_MODE is true, the app uses the local demo-server for cases and inference.
 */
export const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === "true" ||
  import.meta.env.VITE_DEMO === "true";

export const MOCK_SERVER_URL =
  import.meta.env.VITE_MOCK_SERVER_URL || "http://localhost:4002";

/**
 * Frontend flag: when true, gracefully fall back to a
 * locally simulated draft result if the model service
 * is unavailable. Mirrors backend MOCK_FALLBACK.
 *
 * Note: expose via Vite as VITE_MOCK_FALLBACK=true.
 */
export const MOCK_FALLBACK =
  import.meta.env.VITE_MOCK_FALLBACK === "true";
