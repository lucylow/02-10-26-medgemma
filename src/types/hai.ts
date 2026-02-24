/**
 * HAI-DEF 7-task pediatric screening types.
 * Used by useHAIPediScreen and backend /api/hai-infer (or on-device runtime).
 */

export type HAIRiskLevel = "low" | "monitor" | "referral" | "urgent";

/** CHW observation text for ASQ-3 scoring */
export interface CHWObservation {
  observation: string;
  childAgeMonths?: number;
  domains?: string;
  parentalConcern?: string;
}

export interface ASQ3Result {
  risk_level: HAIRiskLevel;
  confidence: number;
  asq3_composite?: number;
  asq3_max?: number;
  percentile?: string;
  icd10?: string[];
  action?: string[];
  followup_days?: number;
}

export interface ROPResult {
  zone: string;
  stage: number;
  plus_disease: boolean;
  risk_level: HAIRiskLevel;
  confidence: number;
  treatment?: string;
  followup_days?: number;
}

export interface BoneAgeResult {
  bone_age_months: number;
  chronological_age_months: number;
  z_score?: number;
  confidence: number;
  maturity_stage?: string;
  endocrine_referral?: boolean;
  icd10?: string[];
}

export interface GrowthData {
  ageMonths: number;
  sex: "M" | "F";
  weightKg?: number;
  lengthCm?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
}

export interface ZScoreResult {
  weight_z?: number;
  length_z?: number;
  height_z?: number;
  hc_z?: number;
  risk_level: HAIRiskLevel;
  followup_days?: number;
}

export interface FractureResult {
  fracture: boolean;
  type?: string;
  displacement_mm?: number;
  ortho_urgency?: "routine" | "priority" | "urgent";
  confidence: number;
}

export interface Patient {
  childAgeMonths?: number;
  sex?: string;
  screeningContext?: Record<string, unknown>;
}

export interface WorkflowResult {
  summary?: string;
  actions?: string[];
  pdfReady?: boolean;
}

export interface ReportResult {
  reportText: string;
  language: string;
  confidence?: number;
}
