/**
 * Deterministic mock-v1 fallback for PediScreen AI v4.0.
 * Produces reproducible screening results based on input_hash
 * for auditability, offline operation, and dry-run pilots.
 *
 * Rules:
 * - seed = first 4 hex chars of input_hash → 16-bit integer
 * - age < 6mo → always low
 * - seed % 100 → <50 low, 50-84 monitor, 85-94 high, ≥95 refer
 * - Critical text flags override risk upward
 * - Confidence derived from seed, bounded [0.30, 0.95]
 */

export interface MockResult {
  riskLevel: string;
  confidence: number;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  evidence: { type: string; content: string; influence: number }[];
  analysis_meta: {
    age_months: number;
    domain: string;
    observations_snippet: string;
    image_provided: boolean;
    mock_version: string;
    seed: number;
  };
}

const SUMMARY_MAP: Record<string, string> = {
  low: "Observations appear within typical developmental limits for this age.",
  monitor: "Some developmental markers warrant monitoring; consider formal screening at next visit.",
  high: "Significant developmental concerns noted — prompt clinical evaluation recommended.",
  refer: "Urgent referral recommended for comprehensive developmental evaluation.",
};

const DOMAIN_FINDINGS: Record<string, { finding: string; rec: string }> = {
  language: { finding: "Language/communication patterns assessed", rec: "Complete ASQ-3 communication domain" },
  motor: { finding: "Gross/fine motor skills assessed", rec: "Refer to PT/OT if concerns persist" },
  social: { finding: "Social-emotional development assessed", rec: "Complete ASQ:SE-2 screening" },
  cognitive: { finding: "Cognitive/adaptive skills assessed", rec: "Consider Bayley-III cognitive subscale" },
  general: { finding: "General developmental milestones assessed", rec: "Continue routine surveillance per AAP schedule" },
};

// Critical text patterns that override risk upward
const CRITICAL_PATTERNS: { pattern: RegExp; minRisk: string; boost: number; finding: string }[] = [
  { pattern: /no\s*words?|not\s+speak|doesn't\s+talk|can't\s+say/i, minRisk: "high", boost: 0.9, finding: "No spoken words — possible speech/hearing concern" },
  { pattern: /doesn't\s+respond|no\s+response|ignor/i, minRisk: "monitor", boost: 0.85, finding: "Reduced responsiveness to social cues" },
  { pattern: /no\s+eye\s*contact|avoids?\s+eye/i, minRisk: "monitor", boost: 0.8, finding: "Limited eye contact reported" },
  { pattern: /loss\s+of|regress|lost\s+skills/i, minRisk: "refer", boost: 0.95, finding: "Developmental regression reported — urgent evaluation" },
  { pattern: /seizure|convuls/i, minRisk: "refer", boost: 0.95, finding: "Seizure-like activity — immediate medical evaluation" },
  { pattern: /only\s+\d+\s+words?/i, minRisk: "monitor", boost: 0.7, finding: "Limited expressive vocabulary for age" },
  { pattern: /not\s+walk|can't\s+walk|doesn't\s+walk/i, minRisk: "monitor", boost: 0.75, finding: "Delayed gross motor milestone" },
  { pattern: /head\s+banging|self.?harm/i, minRisk: "high", boost: 0.85, finding: "Repetitive/self-injurious behavior reported" },
];

const RISK_ORDER = ["low", "monitor", "high", "refer"];

function riskAtLeast(current: string, minimum: string): string {
  const ci = RISK_ORDER.indexOf(current);
  const mi = RISK_ORDER.indexOf(minimum);
  return mi > ci ? minimum : current;
}

export function deterministicMock(
  ageMonths: number,
  domain: string,
  observations: string,
  hasImage: boolean,
  inputHash: string,
): MockResult {
  const obs = (observations || "").toLowerCase();
  const evidence: { type: string; content: string; influence: number }[] = [];
  const keyFindings: string[] = [];
  const recommendations: string[] = [];

  // 16-bit seed from first 4 hex chars
  const seed = parseInt(inputHash.slice(0, 4), 16);
  let score: number;
  let risk: string;

  if (ageMonths < 6) {
    risk = "low";
    score = 0.85 + (seed % 10) / 100;
  } else {
    const bucket = seed % 100;
    if (bucket < 50) { risk = "low"; score = 0.75 + (seed % 20) / 100; }
    else if (bucket < 85) { risk = "monitor"; score = 0.55 + (seed % 15) / 100; }
    else if (bucket < 95) { risk = "high"; score = 0.40 + (seed % 15) / 100; }
    else { risk = "refer"; score = 0.30 + (seed % 10) / 100; }
  }

  // Apply critical pattern overrides
  for (const cp of CRITICAL_PATTERNS) {
    if (cp.pattern.test(obs)) {
      risk = riskAtLeast(risk, cp.minRisk);
      score = Math.max(score, cp.boost);
      evidence.push({ type: "text", content: cp.finding, influence: cp.boost });
      keyFindings.push(cp.finding);
    }
  }

  // Age-appropriate milestone checks
  if (ageMonths >= 12 && ageMonths < 24 && obs.includes("10 words")) {
    evidence.push({ type: "text", content: "Vocabulary ~10 words at 12-24mo — borderline", influence: 0.6 });
    keyFindings.push("Expressive vocabulary smaller than expected for age.");
    risk = riskAtLeast(risk, "monitor");
  }

  if (ageMonths >= 24 && ageMonths < 36) {
    if (!obs.includes("phrase") && !obs.includes("sentence") && obs.length > 20) {
      evidence.push({ type: "text", content: "No mention of phrase speech at 24-36mo", influence: 0.5 });
      keyFindings.push("Consider evaluating for two-word combinations.");
    }
  }

  // Domain-specific findings
  const domainKey = (domain || "general").toLowerCase();
  const domainInfo = DOMAIN_FINDINGS[domainKey] || DOMAIN_FINDINGS.general;
  if (keyFindings.length === 0) {
    keyFindings.push(domainInfo.finding);
    evidence.push({ type: "text", content: "Observations within expected ranges", influence: 0.3 });
  }
  recommendations.push(domainInfo.rec);

  // Always add follow-up recommendation for non-low risk
  if (risk !== "low") {
    recommendations.push("Discuss findings with caregiver and document in chart.");
    recommendations.push("Re-screen in 1-3 months to monitor trajectory.");
  } else {
    recommendations.push("Continue routine monitoring per AAP periodicity schedule.");
  }

  if (hasImage) {
    evidence.push({ type: "image", content: "Image provided for visual developmental context", influence: 0.2 });
    keyFindings.push("Visual assessment data included.");
  }

  // Clamp confidence
  score = Math.round(Math.min(0.95, Math.max(0.30, score)) * 100) / 100;

  return {
    riskLevel: risk,
    confidence: score,
    summary: SUMMARY_MAP[risk] || SUMMARY_MAP.low,
    keyFindings,
    recommendations,
    evidence,
    analysis_meta: {
      age_months: ageMonths,
      domain: domainKey,
      observations_snippet: (observations || "").slice(0, 500),
      image_provided: hasImage,
      mock_version: "mock-v1.1",
      seed,
    },
  };
}
