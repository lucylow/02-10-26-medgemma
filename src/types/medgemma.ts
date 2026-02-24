/**
 * MedGemma + Lovable Cloud domain types.
 * Shared across hooks, components, and edge function contracts.
 */

export type RiskLevel = "low" | "medium" | "high" | "urgent";
export type ScreeningStatus = "draft" | "analyzing" | "complete" | "error";

export interface WearableMetrics {
  hrvRmssd?: number;
  stepsPerDay?: number;
  sleepDurationHours?: number;
  spo2Average?: number;
  fallEvents?: number;
}

export interface DomainAnalysis {
  risk: "low" | "medium" | "high";
  summary: string;
  milestonesMet?: string[];
  concerns?: string[];
}

export interface MedGemmaReport {
  riskLevel: RiskLevel;
  confidence: number;
  asq3Score?: number;
  summary: string;
  parentFriendlyExplanation?: string;
  domainBreakdown?: Record<string, DomainAnalysis>;
  keyFindings: string[];
  recommendations: string[];
  parentFriendlyTips?: string[];
  referralGuidance?: {
    needed: boolean;
    specialties?: string[];
    urgency?: "routine" | "priority" | "urgent";
  };
  followUp?: {
    rescreenIntervalDays: number;
    redFlagsToWatch?: string[];
  };
  icdCodes?: string[];
  evidence?: { type: string; content: string; influence: number }[];
  analysis_meta?: Record<string, unknown>;
}

export interface MedGemmaScreeningResult {
  success: boolean;
  screening_id: string;
  report: MedGemmaReport;
  model_used: boolean;
  model_id: string | null;
  fallback: boolean;
  confidence: number;
  trace_id: string;
  version: string;
  timestamp: string;
}

export interface MedGemmaRequest {
  childAge: number;
  domains: string[];
  observations: string;
  wearable?: WearableMetrics;
  consent_id?: string;
  case_id?: string;
}

export interface ParentNotesResult {
  redFlags: string[];
  urgency: "low" | "medium" | "high";
  confidence: number;
  suggestedDomains: string[];
  parentGuidance: string;
  followUpQuestions?: string[];
  model_used: boolean;
}

export interface WearableRiskResult {
  overallRisk: "normal" | "monitor" | "concern";
  confidence: number;
  hrvAssessment?: string;
  activityAssessment?: string;
  sleepAssessment?: string;
  spo2Assessment?: string;
  alerts: string[];
  recommendations: string[];
  developmentalRelevance?: string;
  trendInsights?: string;
  model_used: boolean;
  ai_error?: string;
}

export interface MilestoneDomain {
  expected: string[];
  redFlags: string[];
}

export interface MilestoneLookupResult {
  ageRange: string;
  milestones: Record<string, MilestoneDomain>;
  screeningTools: string[];
  parentActivities: string[];
  nextScreeningAge?: number;
  sources?: string[];
  model_used: boolean;
  trace_id?: string;
}
