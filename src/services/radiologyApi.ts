/**
 * Radiology case prioritization API.
 * AI-assisted urgency labeling; clinician review required.
 */
const API_BASE =
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "https://api.pediscreen.ai");
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

export async function fetchRadiologyQueue(): Promise<{ items: RadiologyStudy[] }> {
  const res = await fetch(`${API_BASE}/api/radiology/queue`, { headers: headers() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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
  const res = await fetch(`${API_BASE}/api/radiology/benchmark`, { headers: headers() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
