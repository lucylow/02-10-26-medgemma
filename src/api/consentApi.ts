/**
 * Consent API — record parental consent for audit trail.
 */
const API_BASE =
  import.meta.env.VITE_MEDGEMMA_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : 'https://api.pediscreen.ai/v1');
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-example-key';

export interface ConsentScope {
  storeData?: boolean;
  shareWithEHR?: boolean;
  deidentified?: boolean;
  images?: boolean;
}

export async function postConsent(opts: {
  screeningId?: string;
  patientId?: string;
  parentName?: string;
  consentGiven?: boolean;
  consentScope?: ConsentScope;
  consentMethod?: string;
  recordedBy?: string;
  apiKey?: string;
}): Promise<{ success: boolean; consent_id?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': opts.apiKey ?? API_KEY,
  };
  const res = await fetch(`${API_BASE}/api/consent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      screening_id: opts.screeningId,
      patient_id: opts.patientId,
      parent_name: opts.parentName,
      consent_given: opts.consentGiven ?? true,
      consent_scope: opts.consentScope ?? { storeData: true, shareWithEHR: false, deidentified: true },
      consent_method: opts.consentMethod ?? 'web',
      recorded_by: opts.recordedBy ?? 'chw',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to record consent');
  }
  return res.json();
}
