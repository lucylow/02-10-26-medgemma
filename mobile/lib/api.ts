/**
 * PediScreen AI API client — inference, HITL, audit
 * Connects to backend at api.pediscreen.ai or localhost
 */

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? "http://localhost:8000/api" : "https://api.pediscreen.ai/v1");

export interface InferPayload {
  case_id: string;
  age_months: number;
  observations: string;
  embedding_b64?: string;
  shape?: number[];
}

export interface InferResult {
  case_id: string;
  result: {
    summary: string;
    risk: string;
    recommendations: string[];
    parent_text: string;
    explain: string;
    confidence: number;
  };
  inference_time_ms?: number;
}

export async function postInfer(
  payload: InferPayload,
  apiKey?: string
): Promise<InferResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(`${API_BASE}/infer`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      case_id: payload.case_id,
      age_months: payload.age_months,
      observations: payload.observations,
      embedding_b64: payload.embedding_b64,
      shape: payload.shape ?? [1, 256],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || "Inference failed");
  }
  return res.json();
}

export interface AuditLogPayload {
  caseId: string;
  action: string;
  clinicianNotes?: string;
  clinicianId?: string;
  confidence?: number;
}

export async function logAuditEvent(
  payload: AuditLogPayload,
  authToken?: string,
  apiKey?: string
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (apiKey) headers["x-api-key"] = apiKey;

  await fetch(`${API_BASE}/hitl/audit`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      case_id: payload.caseId,
      action: payload.action,
      clinician_notes: payload.clinicianNotes,
      clinician_id: payload.clinicianId,
      confidence: payload.confidence,
      timestamp: new Date().toISOString(),
    }),
  });
}

export interface FinalizePayload {
  caseId: string;
  decision: string;
  finalOutput: unknown;
}

export async function finalizeCase(
  payload: FinalizePayload,
  authToken?: string,
  apiKey?: string
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(`${API_BASE}/hitl/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      case_id: payload.caseId,
      decision: payload.decision,
      final_output: payload.finalOutput,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || "Finalize failed");
  }
}

export interface PendingCase {
  caseId: string;
  risk: string;
  confidence: number;
  summary?: string;
  createdAt: string;
  priority?: "normal" | "high";
}

export async function fetchPendingHitlCases(
  authToken?: string,
  apiKey?: string
): Promise<{ cases: PendingCase[]; pending: number; highPriority: number }> {
  const headers: Record<string, string> = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(`${API_BASE}/hitl/pending`, { headers });

  if (!res.ok) {
    return {
      cases: [],
      pending: 0,
      highPriority: 0,
    };
  }

  const data = await res.json();
  return {
    cases: data.cases ?? data.items ?? [],
    pending: data.pending ?? (data.cases ?? data.items ?? []).length,
    highPriority: data.high_priority ?? 0,
  };
}
