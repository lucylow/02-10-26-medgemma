/**
 * Lightweight analytics — logs to console and optionally to server
 * Events: screen_view, capture_attempt, infer_request, infer_result, clinician_sign
 */

export type AnalyticsEvent =
  | "screen_view"
  | "capture_attempt"
  | "infer_request"
  | "infer_result"
  | "clinician_sign";

export function trackEvent(
  event: AnalyticsEvent,
  props?: Record<string, unknown>
): void {
  const payload = { event, ...props, ts: Date.now() };
  if (import.meta.env.DEV) {
    console.debug("[analytics]", payload);
  }
  // Optional: send to server
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (endpoint) {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }
}
