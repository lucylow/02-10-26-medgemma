/**
 * MedGemma API Client — typed, multimodal-ready orchestration
 * Frontend orchestrates MedGemma via backend; never runs model directly.
 * Supports privacy-first embedding-based inference (design spec Section 16.1).
 */

const API_BASE = import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000/api' : 'https://api.pediscreen.ai/v1');

const DEFAULT_TIMEOUT_MS = 60000;

/** Thrown when MedGemma API returns an error or request fails */
export class MedGemmaApiError extends Error {
  code: string;
  status?: number;
  constructor(message: string, code = "MEDGEMMA_ERROR", status?: number) {
    super(message);
    this.name = "MedGemmaApiError";
    this.code = code;
    this.status = status;
  }
}

async function parseErrorResponse(res: Response): Promise<{ message: string; code: string }> {
  const contentType = res.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  let message = `HTTP ${res.status}`;
  let code = "HTTP_ERROR";
  try {
    if (isJson) {
      const data = await res.json();
      message = (data.detail ?? data.message ?? data.error ?? message) as string;
      code = (data.code ?? code) as string;
    } else {
      message = (await res.text()) || message;
    }
  } catch {
    // keep default message
  }
  return { message, code };
}

export interface MedGemmaPatientInfo {
  patientId: string;
  ageMonths: number;
  sex?: string;
}

export interface MedGemmaInput {
  patientInfo: MedGemmaPatientInfo;
  textObservations: string;
  questionnaireScores: Record<string, number>;
  images?: File[];
  mode: 'draft' | 'final';
}

export interface MedGemmaEvidence {
  type: 'text' | 'image' | 'score';
  summary: string;
  confidence?: number;
}

export interface MedGemmaReport {
  reportId: string;
  status: 'draft' | 'final';
  clinicalSummary: string;
  parentSummary: string;
  riskAssessment: {
    overall: string;
    domains: Record<string, string>;
  };
  evidence: MedGemmaEvidence[];
  recommendations: string[];
  longitudinal?: {
    trajectory: string;
    interpretation: string;
  };
  disclaimer: string;
}

/** Inference result from embedding-based endpoint (privacy-first) */
export interface InferResult {
  case_id: string;
  result: {
    summary: string;
    risk: string;
    recommendations: string[];
    parent_text: string;
    explain: string;
    confidence: number;
    adapter_id?: string;
    model_id?: string;
  };
  provenance: {
    case_id: string;
    base_model_id?: string;
    adapter_id?: string;
    input_hash?: string;
    inference_time_ms?: number;
  };
  inference_time_ms: number;
}

/**
 * Privacy-first inference with precomputed embedding (design spec 4.3, 16.1).
 * Raw images never leave device; client sends L2-normalized embedding only.
 */
export async function inferWithEmbedding(params: {
  case_id: string;
  age_months: number;
  observations: string;
  embedding_b64: string;
  shape?: number[];
  emb_version?: string;
  consent_id?: string;
  user_id_pseudonym?: string;
  apiKey?: string;
}): Promise<InferResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (params.apiKey) headers['x-api-key'] = params.apiKey;
  const timeoutMs = DEFAULT_TIMEOUT_MS;
  const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined;
  try {
    const res = await fetch(`${API_BASE}/infer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        case_id: params.case_id,
        age_months: params.age_months,
        observations: params.observations,
        embedding_b64: params.embedding_b64,
        shape: params.shape ?? [1, 256],
        emb_version: params.emb_version ?? 'medsiglip-v1',
        consent_id: params.consent_id,
        user_id_pseudonym: params.user_id_pseudonym,
      }),
      signal,
    });
    if (!res.ok) {
      const { message, code } = await parseErrorResponse(res);
      throw new MedGemmaApiError(message, code, res.status);
    }
    return res.json();
  } catch (err) {
    if (err instanceof MedGemmaApiError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new MedGemmaApiError('Inference request timed out', 'TIMEOUT');
    }
    if (msg.includes('fetch') || msg.includes('Failed to fetch')) {
      throw new MedGemmaApiError('Network error. Please check your connection.', 'NETWORK_ERROR');
    }
    throw new MedGemmaApiError(msg, 'INFER_FAILED');
  }
}

/**
 * Generate a MedGemma report from multimodal inputs.
 * Uses FormData when images are present; JSON otherwise.
 */
export async function generateMedGemmaReport(input: MedGemmaInput): Promise<MedGemmaReport> {
  const hasImages = input.images && input.images.length > 0;

  if (hasImages) {
    const form = new FormData();
    const payload = {
      patientInfo: input.patientInfo,
      textObservations: input.textObservations,
      questionnaireScores: input.questionnaireScores,
      mode: input.mode,
    };
    form.append('payload', JSON.stringify(payload));
    input.images!.forEach((img) => form.append('images', img));

    const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined;
    const res = await fetch(`${API_BASE}/medgemma/generate`, {
      method: 'POST',
      body: form,
      signal,
    });

    if (!res.ok) {
      const { message, code } = await parseErrorResponse(res);
      throw new MedGemmaApiError(message, code, res.status);
    }

    return res.json();
  }

  const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined;
  const res = await fetch(`${API_BASE}/medgemma/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }

  return res.json();
}

/**
 * Stream MedGemma output token-by-token (when backend supports it).
 */
export async function streamMedGemmaReport(
  input: Omit<MedGemmaInput, 'images'>,
  onChunk: (text: string) => void
): Promise<void> {
  const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined;
  const res = await fetch(`${API_BASE}/medgemma/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new MedGemmaApiError('Stream not available', 'STREAM_ERROR');
  }
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  } catch (err) {
    if (err instanceof MedGemmaApiError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new MedGemmaApiError('Stream timed out', 'TIMEOUT');
    }
    throw new MedGemmaApiError(msg || 'Stream read failed', 'STREAM_ERROR');
  }
}

/** Report draft from backend (PediScreen report generator) */
export interface ReportDraft {
  report_id: string;
  screening_id?: string;
  patient_info: { patient_id: string; age: string; screener?: string };
  risk_assessment: { overall: string; domains: Record<string, string> };
  clinical_summary: string;
  plain_language_summary?: string;
  key_evidence: string[];
  recommendations: string[];
  model_evidence?: unknown[];
  model_confidence?: { overall: number; label: string };
  meta?: { generated_at?: number; persisted?: boolean };
}

/**
 * List draft reports for clinician dashboard (requires Google Identity Bearer token).
 */
export async function listDrafts(
  authToken: string
): Promise<{ items: { report_id: string; screening_id?: string; created_at?: number }[] }> {
  const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined;
  const res = await fetch(`${API_BASE}/reports/drafts`, {
    headers: { Authorization: `Bearer ${authToken}` },
    signal,
  });
  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }
  return res.json();
}

/**
 * Get a report by ID (draft or finalized).
 * Supports both Bearer token (clinician) and x-api-key.
 * If reportId looks like a screening_id (e.g. ps-xxx), tries by-screening first.
 */
export async function getReport(
  reportId: string,
  apiKey?: string,
  authToken?: string
): Promise<{ draft_json?: ReportDraft; final_json?: ReportDraft; status: string; report_id?: string }> {
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (apiKey) headers['x-api-key'] = apiKey;
  const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined;
  let res = await fetch(`${API_BASE}/reports/${reportId}`, { headers, signal });
  if (!res.ok && (reportId.startsWith('ps-') || reportId.includes('-'))) {
    res = await fetch(`${API_BASE}/reports/by-screening/${reportId}`, { headers, signal });
  }
  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }
  return res.json();
}

/**
 * Generate a draft report from a screening.
 */
export async function generateReportFromScreening(
  screeningId: string,
  image?: File,
  apiKey?: string
): Promise<{ success: boolean; draft: ReportDraft }> {
  const form = new FormData();
  form.append('screening_id', screeningId);
  if (image) form.append('image', image, image.name);
  const headers: Record<string, string> = {};
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(`${API_BASE}/reports/generate`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }
  return res.json();
}

/**
 * Approve / sign-off a report (clinician review).
 */
export async function approveReport(
  reportId: string,
  signNote: string,
  authToken?: string,
  options?: {
    clinicianId?: string;
    sendToEhr?: boolean;
    fhirToken?: string;
    apiKey?: string;
    clinicalSummary?: string;
    recommendations?: string[];
    overrideRisk?: string;
    clinicianRationale?: string;
  }
): Promise<{ success: boolean; final_report?: ReportDraft; pdf_base64?: string }> {
  const params: Record<string, string> = {
    sign_note: signNote,
    clinician_id: options?.clinicianId ?? 'clinician',
    send_to_ehr: String(options?.sendToEhr ?? false),
  };
  if (options?.fhirToken) params.fhir_token = options.fhirToken;
  if (options?.clinicalSummary != null) params.clinical_summary = options.clinicalSummary;
  if (options?.recommendations != null) params.recommendations = options.recommendations.join('\n');
  if (options?.overrideRisk) params.override_risk = options.overrideRisk;
  if (options?.clinicianRationale) params.clinician_rationale = options.clinicianRationale;

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (options?.apiKey) headers['x-api-key'] = options.apiKey;

  const res = await fetch(`${API_BASE}/reports/${reportId}/approve`, {
    method: 'POST',
    headers,
    body: new URLSearchParams(params),
    signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined,
  });

  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }
  return res.json();
}

/**
 * Validate edits against safety constraints (prohibited phrases, required disclaimers).
 */
export async function validateEdit(
  content: string,
  apiKey?: string
): Promise<{ valid: boolean; flags: string[] }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(`${API_BASE}/reports/validate-edit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }
  return res.json();
}

/**
 * Get FDA SaMD vs CDS regulatory mapping for a report.
 */
export async function getFdaMapping(
  reportId: string,
  apiKey?: string
): Promise<{
  classification: string;
  criteria: string[];
  sa_md_risk: string;
  human_in_loop: boolean;
  explainable: boolean;
  no_autonomous_diagnosis: boolean;
}> {
  const headers: Record<string, string> = {};
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(
    `${API_BASE}/reports/regulatory/fda-map?report_id=${encodeURIComponent(reportId)}`,
    { headers }
  );
  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }
  return res.json();
}

/**
 * Attach finalized PDF to EHR via SMART-on-FHIR DocumentReference.
 * Requires clinician auth (Bearer token).
 */
export async function attachPdfToEhr(
  reportId: string,
  patientId: string,
  fhirBaseUrl: string,
  fhirToken: string,
  authToken: string
): Promise<{ success: boolean; document_reference?: unknown }> {
  const form = new FormData();
  form.append('report_id', reportId);
  form.append('patient_id', patientId);
  form.append('fhir_base_url', fhirBaseUrl);
  form.append('fhir_token', fhirToken);
  const res = await fetch(`${API_BASE}/ehr/attach-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: form,
  });
  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }
  return res.json();
}

/**
 * Verify uploaded PDF against stored hash (tamper detection).
 */
export async function verifyReportPdf(
  reportId: string,
  pdfFile: File,
  apiKey?: string
): Promise<{ valid: boolean }> {
  const form = new FormData();
  form.append('report_id', reportId);
  form.append('uploaded_pdf', pdfFile);
  const headers: Record<string, string> = {};
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(`${API_BASE}/reports/verify-pdf`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }
  return res.json();
}

/**
 * Export report as PDF with locked sections (audit-ready). Fetches and triggers download.
 */
export async function exportReportPdf(
  reportId: string,
  clinician?: string,
  apiKey?: string
): Promise<void> {
  const params = new URLSearchParams({ report_id: reportId });
  if (clinician) params.set('clinician', clinician);
  const headers: Record<string, string> = {};
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(`${API_BASE}/reports/export/pdf?${params}`, { headers });
  if (!res.ok) {
    const { message, code } = await parseErrorResponse(res);
    throw new MedGemmaApiError(message, code, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pediatric_report.pdf';
  a.click();
  URL.revokeObjectURL(url);
}
