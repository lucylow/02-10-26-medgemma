/**
 * Telemetry API — events, fairness, pilot-metrics export.
 * Uses backend /api/telemetry/* with x-api-key when configured.
 */

const API_BASE =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

const API_KEY = import.meta.env.VITE_API_KEY || "dev-example-key";

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["x-api-key"] = API_KEY;
  return h;
}

export type TelemetryEvent = {
  id: string;
  org_id?: string;
  request_id?: string;
  trace_id?: string;
  endpoint?: string;
  model_name?: string;
  model_version?: string;
  adapter_id?: string;
  latency_ms?: number | null;
  compute_ms?: number | null;
  cost_usd?: number | null;
  success?: boolean;
  error_code?: string | null;
  error_message?: string | null;
  fallback_used?: boolean;
  fallback_reason?: string | null;
  fallback_model?: string | null;
  created_at?: string;
};

export type TelemetryEventsResponse = {
  total: number;
  items: TelemetryEvent[];
};

export type FairnessItem = {
  model_name?: string;
  protected_attribute?: string;
  group_value?: string;
  false_positive_rate?: number;
  false_negative_rate?: number;
  demographic_parity?: number;
  equalized_odds?: number;
  created_at?: string;
};

export type FairnessResponse = {
  total: number;
  items: FairnessItem[];
};

/**
 * Fetch telemetry events with optional filters. When Cloud SQL is disabled, returns empty.
 */
export async function getTelemetryEvents(params?: {
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  fallback_used?: boolean;
}): Promise<TelemetryEventsResponse> {
  const limit = params?.limit ?? 500;
  const offset = params?.offset ?? 0;
  const search = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (params?.date_from) search.set("date_from", params.date_from);
  if (params?.date_to) search.set("date_to", params.date_to);
  if (params?.fallback_used !== undefined)
    search.set("fallback_used", String(params.fallback_used));

  try {
    const res = await fetch(`${API_BASE}/api/telemetry/events?${search}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as TelemetryEventsResponse;
  } catch (e) {
    console.warn("[telemetryApi] getTelemetryEvents failed:", e);
    return { total: 0, items: [] };
  }
}

/**
 * Fetch fairness metrics (FPR/FNR by group). When Cloud SQL is disabled, returns empty.
 */
export async function getFairnessMetrics(params?: {
  model_name?: string;
  limit?: number;
}): Promise<FairnessResponse> {
  const search = new URLSearchParams({
    limit: String(params?.limit ?? 200),
  });
  if (params?.model_name) search.set("model_name", params.model_name);

  try {
    const res = await fetch(`${API_BASE}/api/telemetry/fairness?${search}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as FairnessResponse;
  } catch (e) {
    console.warn("[telemetryApi] getFairnessMetrics failed:", e);
    return { total: 0, items: [] };
  }
}

/**
 * Trigger download of pilot-metrics CSV (drift + bias) from backend.
 * Uses fetch so x-api-key can be sent; creates blob URL for download.
 */
export async function downloadPilotMetricsCsv(): Promise<void> {
  const url = `${API_BASE}/api/telemetry/pilot-metrics?format=csv`;
  try {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = "pilot_metrics_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(u);
  } catch (e) {
    console.warn("[telemetryApi] downloadPilotMetricsCsv failed:", e);
    throw e;
  }
}

/**
 * Fetch pilot-metrics as JSON (for optional use in UI).
 */
export async function getPilotMetricsJson(): Promise<{
  drift_summary?: Array<{ date_bucket?: string; psi_score?: number;
    severity?: string }>;
  bias_summary?: { disparate_impact?: number; flag?: boolean };
  exported_at?: string;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/api/telemetry/pilot-metrics`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Awaited<ReturnType<typeof getPilotMetricsJson>>;
  } catch (e) {
    console.warn("[telemetryApi] getPilotMetricsJson failed:", e);
    return null;
  }
}
