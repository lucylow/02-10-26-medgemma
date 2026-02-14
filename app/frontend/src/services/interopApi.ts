/**
 * Interoperability API — FHIR export, EHR push, consent.
 */
const API_BASE = import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.DEV ? 'http://localhost:8000' : '');

export type ExportFormat = 'fhir' | 'pdf' | 'hl7v2';

export async function exportFhirBundle(
  caseId: string,
  includeConsent = false,
  apiKey?: string
): Promise<object> {
  const url = `${API_BASE}/api/fhir/export_bundle/${caseId}?include_consent=${includeConsent}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type PushBundleRequest = {
  case_id: string;
  fhir_base_url: string;
  fhir_token: string;
  consent_given: boolean;
};

export async function pushBundleToEhr(
  body: PushBundleRequest,
  apiKey?: string
): Promise<{ success: boolean; export_id: string }> {
  const url = `${API_BASE}/api/fhir/push_bundle`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getEhrExportStatus(
  exportId: string,
  apiKey?: string
): Promise<{ export_id: string; status: string; error?: string }> {
  const url = `${API_BASE}/api/ehr/status/${exportId}`;
  const headers: Record<string, string> = {};
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const EHR_CONSENT_COPY =
  'By sharing this report to your electronic health record, you authorize transfer of pediatric screening information. Personal data will be stored in your health system\'s record. You may withdraw at any time.';
