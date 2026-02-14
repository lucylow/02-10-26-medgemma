/**
 * UX analytics instrumentation — Page 18.
 * Tracks screen views, capture events, consent, inference, clinician sign-off.
 * Logs to console in dev; optionally posts to REACT_APP_ANALYTICS_URL.
 * Opt-in controlled via Settings (GDPR).
 */

const ANALYTICS_URL = import.meta.env.REACT_APP_ANALYTICS_URL || import.meta.env.VITE_ANALYTICS_URL;
const OPT_IN_KEY = "pediscreen_analytics_opt_in";

export function isAnalyticsOptedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(OPT_IN_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAnalyticsOptIn(optIn: boolean): void {
  try {
    localStorage.setItem(OPT_IN_KEY, optIn ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export type AnalyticsEvent =
  | { name: "screen_view"; payload: { page: string } }
  | { name: "capture_started"; payload: { type: "photo" | "drawing" | "voice" } }
  | { name: "capture_completed"; payload: { type: "photo" | "drawing" | "voice" } }
  | { name: "consent_given"; payload: { images: boolean; rawImage: boolean } }
  | { name: "infer_request"; payload: Record<string, unknown> }
  | { name: "infer_response"; payload: { risk?: string; screeningId?: string } }
  | { name: "clinician_signoff"; payload: { caseId: string } }
  | { name: string; payload: Record<string, unknown> };

export function track(eventName: string, payload: Record<string, unknown> = {}): void {
  if (!isAnalyticsOptedIn()) return;

  const event = { name: eventName, payload, ts: new Date().toISOString() };

  if (import.meta.env.DEV) {
    console.log("[Analytics]", event);
  }

  if (ANALYTICS_URL) {
    fetch(ANALYTICS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch((e) => console.warn("[Analytics] send failed:", e));
  }
}
