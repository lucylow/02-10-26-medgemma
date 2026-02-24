/**
 * Screenings API — list and get screening records from PediScreen backend.
 * GET /api/screenings, GET /api/screenings/:id with x-api-key.
 */

const API_BASE =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_PEDISCREEN_BACKEND_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

const API_KEY = import.meta.env.VITE_API_KEY || "dev-example-key";

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["x-api-key"] = API_KEY;
  return h;
}

export type ScreeningListItem = {
  screening_id?: string;
  _id?: string;
  child_age_months?: number;
  childAge?: number;
  domain?: string;
  observations?: string;
  image_path?: string;
  report?: {
    riskLevel?: string;
    summary?: string;
    riskRationale?: string;
    [key: string]: unknown;
  };
  created_at?: string;
  timestamp?: string;
};

export type ListScreeningsResponse = {
  items: ScreeningListItem[];
  count: number;
};

const DOMAIN_LABELS: Record<string, string> = {
  communication: "Communication & Language",
  gross_motor: "Gross Motor",
  fine_motor: "Fine Motor",
  cognitive: "Problem Solving",
  social: "Personal-Social",
};

/**
 * Map backend screening item to clinician-review queue entry shape.
 */
export function mapToReviewEntry(
  item: ScreeningListItem,
  index: number
): {
  id: string;
  childId: string;
  childName: string;
  date: string;
  domain: string;
  domainLabel: string;
  riskLevel: string;
  summary: string;
  screeningId?: string;
} {
  const sid = item.screening_id ?? item._id ?? `s${index}`;
  const ts = item.created_at ?? item.timestamp;
  const date = ts
    ? new Date(ts).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
  const domain = item.domain ?? "communication";
  const risk = item.report?.riskLevel ?? "unknown";
  const riskLabel =
    typeof risk === "string"
      ? risk.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Unknown";
  return {
    id: sid,
    childId: "backend",
    childName: "Child",
    date,
    domain,
    domainLabel: DOMAIN_LABELS[domain] ?? domain,
    riskLevel: riskLabel,
    summary: item.report?.summary ?? item.observations?.slice(0, 120) ?? "No summary.",
    screeningId: sid,
  };
}

/**
 * List screenings from backend. Returns empty when backend is unavailable or returns error.
 */
export async function listScreenings(params?: {
  limit?: number;
  skip?: number;
}): Promise<ListScreeningsResponse> {
  const limit = params?.limit ?? 50;
  const skip = params?.skip ?? 0;
  const url = `${API_BASE}/api/screenings?limit=${limit}&skip=${skip}`;
  try {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ListScreeningsResponse;
    return { items: data.items ?? [], count: data.count ?? data.items?.length ?? 0 };
  } catch (e) {
    console.warn("[screeningsApi] listScreenings failed:", e);
    return { items: [], count: 0 };
  }
}
