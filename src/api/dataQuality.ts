/**
 * Data quality API — completeness, validation for screenings.
 * Backend: GET /api/data-quality/:case_id, POST /api/data-quality/validate
 */

import { apiClient } from '@/services/apiClient';

export interface DataQualityReport {
  case_id: string;
  completeness_score: number;
  missing_fields: string[];
  probability_of_noise: number;
  consent_present: boolean;
  consent_id?: string;
  validation_errors: string[];
  warnings: string[];
}

export async function getDataQuality(caseId: string): Promise<DataQualityReport> {
  return apiClient<DataQualityReport>(`/data-quality/${encodeURIComponent(caseId)}`);
}

export interface ValidateDataQualityPayload {
  child_age_months?: number;
  childAge?: number;
  domain?: string;
  observations?: string;
  consent_id?: string;
  consent_flag?: boolean;
  image_path?: string;
  image?: unknown;
}

export interface ValidateDataQualityResponse {
  processed_payload: unknown;
  completeness_score: number;
  missing_fields: string[];
  probability_of_noise: number;
  consent_present: boolean;
  consent_id?: string;
  validation_errors: string[];
  warnings: string[];
  valid: boolean;
}

export async function validateDataQuality(
  payload: ValidateDataQualityPayload
): Promise<ValidateDataQualityResponse> {
  return apiClient<ValidateDataQualityResponse>('/data-quality/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
