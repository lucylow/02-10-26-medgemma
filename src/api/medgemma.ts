/**
 * MedGemma API Client — typed, multimodal-ready orchestration
 * Frontend orchestrates MedGemma via backend; never runs model directly.
 */

const API_BASE = import.meta.env.VITE_MEDGEMMA_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://api.pediscreen.ai/v1');

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

    const res = await fetch(`${API_BASE}/medgemma/generate`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'MedGemma generation failed');
    }

    return res.json();
  }

  const res = await fetch(`${API_BASE}/medgemma/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || 'MedGemma generation failed');
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
  const res = await fetch(`${API_BASE}/medgemma/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error('MedGemma stream failed');
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
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
  meta?: { generated_at?: number; persisted?: boolean };
}

/**
 * Get a report by ID (draft or finalized).
 * If reportId looks like a screening_id (e.g. ps-xxx), tries by-screening first.
 */
export async function getReport(
  reportId: string,
  apiKey?: string
): Promise<{ draft_json?: ReportDraft; final_json?: ReportDraft; status: string; report_id?: string }> {
  const headers: Record<string, string> = {};
  if (apiKey) headers['x-api-key'] = apiKey;
  // Try by-screening when id looks like screening (ps-xxx) or when direct get fails
  let res = await fetch(`${API_BASE}/reports/${reportId}`, { headers });
  if (!res.ok && (reportId.startsWith('ps-') || reportId.includes('-'))) {
    res = await fetch(`${API_BASE}/reports/by-screening/${reportId}`, { headers });
  }
  if (!res.ok) throw new Error('Report not found');
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
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Report generation failed');
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (options?.apiKey) headers['x-api-key'] = options.apiKey;

  const res = await fetch(`${API_BASE}/reports/${reportId}/approve`, {
    method: 'POST',
    headers,
    body: new URLSearchParams(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Report approval failed');
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
  if (!res.ok) throw new Error('Validation failed');
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
  if (!res.ok) throw new Error('FDA mapping not found');
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
  if (!res.ok) throw new Error('PDF export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pediatric_report.pdf';
  a.click();
  URL.revokeObjectURL(url);
}
