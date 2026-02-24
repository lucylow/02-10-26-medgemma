/**
 * Data Subject Rights (GDPR) API — export, erase, rectify.
 * Backend: GET /api/dsr/export, POST /api/dsr/erase, POST /api/dsr/rectify
 */

import { apiClient, ApiClientError } from '@/services/apiClient';

export interface DsrExportParams {
  user_id?: string;
  case_id?: string;
}

/** Trigger export; returns ZIP blob. Caller should trigger download. */
export async function exportData(params: DsrExportParams): Promise<Blob> {
  const API_BASE =
    import.meta.env.VITE_PEDISCREEN_BACKEND_URL ||
    import.meta.env.VITE_MEDGEMMA_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://api.pediscreen.ai/v1');
  const API_KEY = import.meta.env.VITE_API_KEY || 'dev-example-key';
  const q = new URLSearchParams();
  if (params.user_id) q.set('user_id', params.user_id);
  if (params.case_id) q.set('case_id', params.case_id);
  const url = `${API_BASE}/dsr/export?${q.toString()}`;
  const res = await fetch(url, {
    headers: { 'x-api-key': API_KEY },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const j = JSON.parse(text);
      message = j.detail ?? j.message ?? text;
    } catch {
      // use text
    }
    throw new ApiClientError(message, 'DSR_EXPORT_FAILED', res.status);
  }
  return res.blob();
}

export interface DsrEraseParams {
  user_id?: string;
  case_id?: string;
}

export interface DsrEraseResponse {
  success: boolean;
  deleted_count: number;
}

export async function eraseData(params: DsrEraseParams): Promise<DsrEraseResponse> {
  return apiClient<DsrEraseResponse>('/dsr/erase', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface DsrRectifyParams {
  case_id: string;
  field: string;
  new_value: string;
}

export interface DsrRectifyResponse {
  success: boolean;
  message: string;
  case_id: string;
}

export async function rectifyData(params: DsrRectifyParams): Promise<DsrRectifyResponse> {
  return apiClient<DsrRectifyResponse>('/dsr/rectify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
