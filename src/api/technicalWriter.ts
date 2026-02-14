/**
 * MedGemma Detailed Writer API — clinical-grade technical report generation.
 */

const API_BASE =
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : 'https://api.pediscreen.ai');

const API_KEY = import.meta.env.VITE_API_KEY || 'dev-example-key';

function headers(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    'x-api-key': API_KEY,
    ...extra,
  };
  return h;
}

export interface TechnicalReportData {
  report_id: string;
  screening_id?: string;
  patient_id?: string;
  clinical_summary: string;
  technical_summary: string;
  parent_summary: string;
  risk_assessment_overall: string;
  domains: Array<{ domain: string; rating: string; rationale: string; quantitative_scores?: Record<string, number> }>;
  evidence: Array<{ id: string; type: string; summary: string; provenance?: Record<string, unknown> }>;
  recommendations: string[];
  citations: Array<{ id: string; text: string; url?: string }>;
  status: string;
}

export async function generateDraft(formData: FormData): Promise<TechnicalReportData> {
  const res = await fetch(`${API_BASE}/api/medgemma/generate`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
    },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Generate failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchReport(reportId: string): Promise<{
  report_id: string;
  screening_id?: string;
  draft_json?: TechnicalReportData;
  final_json?: TechnicalReportData;
  status: string;
  clinician_id?: string;
  clinician_signed_at?: number;
  created_at?: number;
}> {
  const res = await fetch(`${API_BASE}/api/reports/${reportId}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error('Report not found');
  return res.json();
}

export async function patchReport(
  reportId: string,
  body: { clinical_summary?: string; technical_summary?: string; parent_summary?: string; recommendations?: string[] }
): Promise<{ report_id: string; draft_json: TechnicalReportData; status: string }> {
  const res = await fetch(`${API_BASE}/api/reports/${reportId}/patch`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'Patch failed');
  }
  return res.json();
}

export async function finalizeReport(
  reportId: string,
  clinicianNote: string,
  clinicianId?: string
): Promise<{ success: boolean; final_report: TechnicalReportData; pdf_base64?: string }> {
  const fd = new URLSearchParams();
  fd.set('sign_note', clinicianNote);
  if (clinicianId) fd.set('clinician_id', clinicianId);

  const res = await fetch(`${API_BASE}/api/reports/${reportId}/approve`, {
    method: 'POST',
    headers: headers(),
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'Finalize failed');
  }
  return res.json();
}

// --- End-to-end flow (screening → draft → edit → finalize → PDF) ---

export async function generateDraftEnd2End(formData: FormData): Promise<TechnicalReportData> {
  const res = await fetch(`${API_BASE}/api/medgemma/generate-end2end`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Generate failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchReportEnd2End(reportId: string): Promise<{
  report_id: string;
  screening_id?: string;
  draft_json?: TechnicalReportData;
  final_json?: TechnicalReportData;
  status: string;
  clinician_id?: string;
  clinician_signed_at?: number;
  created_at?: number;
}> {
  const res = await fetch(`${API_BASE}/api/medgemma/reports/${reportId}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error('Report not found');
  return res.json();
}

export async function patchReportEnd2End(
  reportId: string,
  patch: { clinical_summary?: string; technical_summary?: string; parent_summary?: string; recommendations?: string[] }
): Promise<{ ok: boolean; updated_draft: TechnicalReportData }> {
  const res = await fetch(`${API_BASE}/api/medgemma/reports/${reportId}/patch`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'Patch failed');
  }
  return res.json();
}

export async function finalizeReportEnd2End(
  reportId: string,
  clinicianNote: string
): Promise<{ ok: boolean; final: TechnicalReportData; pdf_base64: string }> {
  const body = new URLSearchParams();
  body.append('clinician_note', clinicianNote);
  const res = await fetch(`${API_BASE}/api/medgemma/reports/${reportId}/approve`, {
    method: 'POST',
    headers: headers(),
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'Finalize failed');
  }
  return res.json();
}
