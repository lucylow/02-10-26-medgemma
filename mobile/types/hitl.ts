/**
 * HITL (Human-in-the-Loop) types for PediScreen AI
 * Aligns with MedGemma inference output and clinical workflow
 */

export type HitlDecision = "approve" | "reject" | "edit" | "escalate";
export type HitlStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "edited";

export type RiskLevel = "low" | "monitor" | "elevated" | "discuss" | "refer";

export interface MedGemmaOutput {
  summary: string;
  risk: RiskLevel;
  recommendations: string[];
  parent_text?: string;
  explain?: string | string[];
  confidence: number;
  case_id?: string;
  provenance?: {
    case_id: string;
    base_model_id?: string;
    adapter_id?: string;
    inference_time_ms?: number;
  };
}

export interface AuditEvent {
  action: HitlDecision | "ai_draft" | "entered_hitl";
  clinicianNotes?: string;
  clinicianId?: string;
  confidence?: number;
  timestamp: string;
  caseId?: string;
}

export interface HitlState {
  caseId: string;
  agentOutput: MedGemmaOutput;
  clinicianNotes: string[];
  decision: HitlDecision | null;
  confidenceThreshold: number;
  status: HitlStatus;
  auditTrail: AuditEvent[];
  feedbackScore: number | null;
}
