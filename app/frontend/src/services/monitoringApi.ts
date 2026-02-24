const API_BASE =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

const API_KEY = import.meta.env.VITE_API_KEY || "dev-example-key";

export type DriftMetricPoint = {
  /** ISO date or short label like 2026-02-24 */
  date: string;
  /** Population stability index or similar drift score (0–1 recommended) */
  psi_score: number;
  /** Optional: number of screenings in bucket */
  volume?: number;
};

export type BiasMetrics = {
  /** Disparate impact ratio across a protected group (e.g. 0.8 “four-fifths rule”) */
  disparate_impact: number;
  /** Optional: per-group positive prediction rates */
  group_rates?: Record<string, number>;
};

type PilotDriftRow = {
  date_bucket?: string;
  psi_score?: number;
  severity?: string;
  volume?: number;
};

type PilotMetricsResponse = {
  drift_summary?: PilotDriftRow[];
  bias_summary?: {
    disparate_impact?: number;
    flag?: boolean;
    [key: string]: unknown;
  };
};

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (API_KEY) {
      headers["x-api-key"] = API_KEY;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      headers,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[monitoringApi] Falling back for ${path}:`, error);
    return fallback;
  }
}

export async function getDriftMetrics(): Promise<DriftMetricPoint[]> {
  const fallback: DriftMetricPoint[] = [
    { date: "T-6", psi_score: 0.08, volume: 42 },
    { date: "T-5", psi_score: 0.09, volume: 51 },
    { date: "T-4", psi_score: 0.11, volume: 47 },
    { date: "T-3", psi_score: 0.14, volume: 55 },
    { date: "T-2", psi_score: 0.18, volume: 63 },
    { date: "T-1", psi_score: 0.22, volume: 60 },
    { date: "Today", psi_score: 0.25, volume: 58 },
  ];

  const metrics = await getJson<PilotMetricsResponse | null>(
    "/api/telemetry/pilot-metrics",
    null
  );

  if (!metrics || !Array.isArray(metrics.drift_summary)) {
    return fallback;
  }

  const mapped = metrics.drift_summary
    .map((row) => ({
      date: row.date_bucket ?? "",
      psi_score: typeof row.psi_score === "number" ? row.psi_score : 0,
      volume: row.volume,
    }))
    .filter((point) => point.date);

  return mapped.length ? mapped : fallback;
}

export async function getBiasMetrics(): Promise<BiasMetrics> {
  const fallback: BiasMetrics = {
    disparate_impact: 0.84,
    group_rates: {
      "Group A": 0.32,
      "Group B": 0.27,
      "Group C": 0.30,
    },
  };

  const metrics = await getJson<PilotMetricsResponse | null>(
    "/api/telemetry/pilot-metrics",
    null
  );

  const di =
    typeof metrics?.bias_summary?.disparate_impact === "number"
      ? metrics.bias_summary.disparate_impact
      : undefined;

  if (di == null) {
    return fallback;
  }

  // For now we only expose overall disparate impact; per-group rates can be
  // wired from /api/telemetry/fairness in a later phase.
  return {
    disparate_impact: di,
  };
}

