/**
 * Demo mode and API URLs for PediScreen.
 * When VITE_DEMO_MODE is true, the app uses the local demo-server for cases and inference.
 */
export const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === "true" ||
  import.meta.env.VITE_DEMO === "true";

export const MOCK_SERVER_URL =
  import.meta.env.VITE_MOCK_SERVER_URL || "http://localhost:4002";
