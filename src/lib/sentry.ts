/**
 * Sentry placeholder — init when DSN provided and @sentry/react installed
 * Add: npm install @sentry/react
 * Set: VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
 */

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  // When DSN is set, integrate: import * as Sentry from "@sentry/react"; Sentry.init({ dsn, ... });
  if (import.meta.env.DEV) {
    console.debug("[sentry] Placeholder — set VITE_SENTRY_DSN and add @sentry/react to enable");
  }
}
