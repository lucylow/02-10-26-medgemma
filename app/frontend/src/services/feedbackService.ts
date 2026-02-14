/**
 * Clinician feedback service for AI inference outputs.
 * Submit and retrieve structured feedback tied to inference IDs.
 */

const API_BASE =
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  import.meta.env.VITE_PEDISCREEN_BACKEND_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "https://api.pediscreen.ai");

export type FeedbackType = "correction" | "rating" | "comment";
export type RiskLevel = "low" | "monitor" | "refer" | "on_track" | "high";

export interface FeedbackCreate {
  inference_id: string;
  case_id: string;
  feedback_type: FeedbackType;
  corrected_risk?: RiskLevel;
  corrected_summary?: string;
  rating?: number;
  comment?: string;
  clinician_notes?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackItem {
  feedback_id: string;
  case_id: string;
  inference_id: string;
  clinician_id: string;
  provided_at: string;
  feedback_type: FeedbackType;
  corrected_risk?: RiskLevel;
  corrected_summary?: string;
  rating?: number;
  comment?: string;
  clinician_notes?: string;
  metadata?: Record<string, unknown>;
}

export async function submitFeedback(
  feedbackData: FeedbackCreate,
  apiKey?: string
): Promise<{ feedback_id: string; status: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  const response = await fetch(`${API_BASE}/api/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify(feedbackData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function getFeedbackForInference(
  inferenceId: string,
  apiKey?: string
): Promise<{ inference_id: string; feedback: FeedbackItem[] }> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  const response = await fetch(
    `${API_BASE}/api/feedback/inference/${inferenceId}`,
    { headers }
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export async function getFeedbackForCase(
  caseId: string,
  apiKey?: string
): Promise<{ case_id: string; feedback: FeedbackItem[] }> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  const response = await fetch(`${API_BASE}/api/feedback/case/${caseId}`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
