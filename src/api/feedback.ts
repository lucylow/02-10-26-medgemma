/**
 * Clinician feedback API — structured, auditable feedback for AI inference outputs.
 * Backend: POST/GET /api/feedback
 */

import { apiClient } from '@/services/apiClient';

export type FeedbackType = 'correction' | 'rating' | 'comment';
export type CorrectedRisk = 'low' | 'monitor' | 'refer' | 'on_track' | 'high';

export interface FeedbackCreatePayload {
  inference_id: string;
  case_id: string;
  feedback_type: FeedbackType;
  corrected_risk?: CorrectedRisk;
  corrected_summary?: string;
  rating?: number; // 1–5
  comment?: string;
  clinician_notes?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackItem {
  feedback_id: string;
  inference_id: string;
  case_id: string;
  clinician_id: string;
  feedback_type: string;
  corrected_risk?: string;
  corrected_summary?: string;
  rating?: number;
  comment?: string;
  clinician_notes?: string;
  created_at?: string;
}

export interface CreateFeedbackResponse {
  feedback_id: string;
  inference_id: string;
  case_id: string;
  status: string;
}

export async function createFeedback(payload: FeedbackCreatePayload): Promise<CreateFeedbackResponse> {
  return apiClient<CreateFeedbackResponse>('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getFeedbackForCase(caseId: string): Promise<{ case_id: string; feedback: FeedbackItem[] }> {
  return apiClient<{ case_id: string; feedback: FeedbackItem[] }>(`/feedback/case/${encodeURIComponent(caseId)}`);
}

export async function getFeedbackForInference(inferenceId: string): Promise<{
  inference_id: string;
  feedback: FeedbackItem[];
}> {
  return apiClient<{ inference_id: string; feedback: FeedbackItem[] }>(
    `/feedback/inference/${encodeURIComponent(inferenceId)}`
  );
}
