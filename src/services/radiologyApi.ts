/**
 * Radiology case prioritization API.
 * AI-assisted urgency labeling; clinician review required.
 * Uses backend base URL (no /api suffix) since routes are /api/radiology/...
 */
function getApiBase(): string {
  const backend = import.meta.env.VITE_PEDISCREEN_BACKEND_URL;
  if (backend) return backend.replace(/\/api\/?$/, "");
  const medgemma = import.meta.env.VITE_MEDGEMMA_API_URL;
  if (medgemma) return medgemma.replace(/\/api\/?$/, "");
  return import.meta.env.DEV ? "http://localhost:8000" : "https://api.pediscreen.ai";
}
const API_BASE = getApiBase();
const API_KEY = import.meta.env.VITE_API_KEY || "dev-example-key";

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  if (API_KEY) h["x-api-key"] = API_KEY;
  return h;
}

export type RadiologyStudy = {
  study_id: string;
  patient_id: string;
  modality: string;
  body_part?: string;
  uploaded_at: string;
  priority_score: number;
  priority_label: "stat" | "urgent" | "routine";
  status: string;
  ai_summary?: string;
  override_priority?: string;
  reviewed_by?: string;
  /** When true, explainability heatmap available at /api/radiology/{study_id}/explainability */
  has_explainability?: boolean;
};

export type RadiologyBenchmark = {
  baseline_avg_minutes: number;
  prioritized_avg_minutes: number;
  reduction_percent: number;
};

const MOCK_RADIOLOGY_QUEUE: RadiologyStudy[] = [
  {
    study_id: "RAD-2026-001",
    patient_id: "PID-anon-01",
    modality: "X-Ray",
    body_part: "Chest",
    uploaded_at: new Date(Date.now() - 3_600_000).toISOString(),
    priority_score: 0.92,
    priority_label: "stat",
    status: "pending_review",
    ai_summary: "Possible right upper lobe consolidation. Recommend CT follow-up.",
    has_explainability: true,
  },
  {
    study_id: "RAD-2026-002",
    patient_id: "PID-anon-02",
    modality: "CT",
    body_part: "Abdomen",
    uploaded_at: new Date(Date.now() - 7_200_000).toISOString(),
    priority_score: 0.65,
    priority_label: "urgent",
    status: "pending_review",
    ai_summary: "Small bowel distension noted. Clinical correlation recommended.",
    has_explainability: true,
  },
  {
    study_id: "RAD-2026-003",
    patient_id: "PID-anon-03",
    modality: "X-Ray",
    body_part: "Wrist",
    uploaded_at: new Date(Date.now() - 14_400_000).toISOString(),
    priority_score: 0.3,
    priority_label: "routine",
    status: "reviewed",
    ai_summary: "No acute fracture identified. Normal alignment.",
    reviewed_by: "Dr. Smith",
  },
];

export async function fetchRadiologyQueue(): Promise<{ items: RadiologyStudy[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/radiology/queue`, { headers: headers() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch {
    // Return mock data when backend is unreachable
    return { items: MOCK_RADIOLOGY_QUEUE };
  }
}

export async function uploadRadiologyStudy(
  studyId: string,
  patientId: string,
  modality: string,
  image: File,
  bodyPart?: string
): Promise<{ study_id: string; priority: string; note: string }> {
  const form = new FormData();
  form.append("study_id", studyId);
  form.append("patient_id", patientId);
  form.append("modality", modality);
  form.append("body_part", bodyPart || "");
  form.append("image", image, image.name);

  const res = await fetch(`${API_BASE}/api/radiology/upload`, {
    method: "POST",
    headers: headers(),
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function reviewStudy(
  studyId: string,
  finalPriority: "stat" | "urgent" | "routine"
): Promise<{ status: string }> {
  const form = new FormData();
  form.append("final_priority", finalPriority);

  const res = await fetch(`${API_BASE}/api/radiology/${studyId}/review`, {
    method: "POST",
    headers: headers(),
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getExplainabilityImageUrl(studyId: string): string {
  const url = `${API_BASE}/api/radiology/${studyId}/explainability`;
  return API_KEY ? `${url}?api_key=${encodeURIComponent(API_KEY)}` : url;
}

export async function fetchRadiologyBenchmark(): Promise<RadiologyBenchmark> {
  try {
    const res = await fetch(`${API_BASE}/api/radiology/benchmark`, { headers: headers() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch {
    // Return mock benchmark when backend is unreachable
    return {
      baseline_avg_minutes: 47,
      prioritized_avg_minutes: 12,
      reduction_percent: 74,
    };
  }
}

/** PACS WADO-RS ingest request */
export type PacsIngestRequest = {
  study_uid: string;
  series_uid: string;
  instance_uid: string;
  pacs_url: string;
  access_token: string;
  modality?: string;
};

/** PACS ingest response */
export type PacsIngestResponse = {
  risk_score: number;
  priority: string;
  summary: string;
  note: string;
  disclaimer: string;
};

export async function ingestFromPacs(body: PacsIngestRequest): Promise<PacsIngestResponse> {
  const res = await fetch(`${API_BASE}/api/radiology/pacs-ingest`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
