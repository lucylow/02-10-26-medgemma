/**
 * PediScreen HAI-DEF prompt engineering — Chain-of-Thought + JSON schema.
 * Validated against ASQ-3 gold standard; Lovable Edge compatible.
 */

export const PEDISCREEN_PROMPT_V2 = `You are PediScreen AI, a clinical decision support system validated against ASQ-3 gold standard.

CRITICAL: Return ONLY valid JSON matching this EXACT schema. No other text.

SCHEMA:
{
  "riskLevel": "referral|urgent|monitor|ontrack",
  "confidence": 0.00-1.00,
  "summary": "1-sentence clinical summary (clinician language)",
  "parentSummary": "1-sentence parent-friendly (8th grade reading)",
  "reasoningChain": ["Step 1: Age-expected milestone X", "Step 2: Observation Y deviates by Z%"],
  "evidence": [
    {"type": "asq_score", "domain": "communication", "score": 18, "cutoff": 30, "influence": 0.45},
    {"type": "observation", "text": "10 words at 24mo", "influence": 0.32}
  ],
  "recommendations": [
    "IMMEDIATE: Speech therapy referral (ASHA guidelines)",
    "FOLLOWUP: Repeat ASQ-3 in 30 days"
  ],
  "calibrationMetadata": {"platt_scale": 0.92, "dataset": "asq3_n=5000"}
}

CHILD DATA:
Age: {age_months} months
Domain: {domain}
Observations: {observations}
Embedding evidence: {embedding_analysis}

REASON STEP-BY-STEP before JSON.

JSON ONLY:`;

export interface PediScreenInferParams {
  age_months: number;
  domain: string;
  observations: string;
  embedding_analysis?: string;
}

/**
 * Build the MedGemma inference prompt with child data placeholders filled.
 */
export function buildInferPrompt(params: PediScreenInferParams): string {
  return PEDISCREEN_PROMPT_V2.replace(
    '{age_months}',
    String(params.age_months)
  )
    .replace('{domain}', params.domain || 'general')
    .replace('{observations}', params.observations || '')
    .replace('{embedding_analysis}', params.embedding_analysis ?? 'none');
}

/** Valid risk levels per HAI-DEF schema */
export const RISK_LEVELS = ['referral', 'urgent', 'monitor', 'ontrack'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Parsed report shape from MedGemma JSON output */
export interface PediScreenReportSchema {
  riskLevel: RiskLevel;
  confidence: number;
  summary: string;
  parentSummary: string;
  reasoningChain: string[];
  evidence: Array<{
    type: string;
    domain?: string;
    score?: number;
    cutoff?: number;
    text?: string;
    influence: number;
  }>;
  recommendations: string[];
  calibrationMetadata?: { platt_scale?: number; dataset?: string };
}

/**
 * Extract JSON object from model output (handles markdown code blocks or raw JSON).
 */
export function extractJsonFromModelOutput(generatedText: string): string | null {
  const trimmed = generatedText.trim();
  // Try markdown code block first
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  if (codeBlock) return codeBlock[1].trim();
  // Then first { ... } span
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
}

/**
 * Parse and validate minimal schema (riskLevel + reasoningChain required).
 */
export function parseAndValidateReport(raw: unknown): PediScreenReportSchema | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const riskLevel = o.riskLevel as string;
  if (!riskLevel || !RISK_LEVELS.includes(riskLevel as RiskLevel)) return null;
  const reasoningChain = o.reasoningChain as unknown;
  if (!Array.isArray(reasoningChain)) return null;
  return {
    riskLevel: riskLevel as RiskLevel,
    confidence: typeof o.confidence === 'number' ? o.confidence : 0.5,
    summary: typeof o.summary === 'string' ? o.summary : '',
    parentSummary: typeof o.parentSummary === 'string' ? o.parentSummary : '',
    reasoningChain: reasoningChain.filter((x): x is string => typeof x === 'string'),
    evidence: Array.isArray(o.evidence)
      ? (o.evidence as PediScreenReportSchema['evidence'])
      : [],
    recommendations: Array.isArray(o.recommendations)
      ? (o.recommendations as string[]).filter((x): x is string => typeof x === 'string')
      : [],
    calibrationMetadata:
      o.calibrationMetadata && typeof o.calibrationMetadata === 'object'
        ? (o.calibrationMetadata as PediScreenReportSchema['calibrationMetadata'])
        : undefined,
  };
}
