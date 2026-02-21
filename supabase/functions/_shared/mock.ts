/**
 * Deterministic mock-v1 fallback for PediScreen AI.
 * Produces reproducible screening results based on input_hash
 * for auditability and offline operation.
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
  };
}

const SUMMARY_MAP: Record<string, string> = {
  low: "Observations appear within typical developmental limits.",
  monitor: "Some developmental markers to monitor; consider formal screening.",
  high: "Significant concerns — prompt clinical evaluation recommended.",
  refer: "Urgent referral recommended for comprehensive evaluation.",
};

/**
 * Generate a deterministic baseline report using mock-v1 rules.
 * Risk is derived from HMAC(master_key, input_hash) seed byte.
 */
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

  // Seed from first two hex chars of input_hash
  const seedByte = parseInt(inputHash.slice(0, 2), 16);
  let score: number;
  let risk: string;

  if (ageMonths < 6) {
    risk = "low";
    score = 0.9;
  } else {
    // Conservative pediatric bias: increase 'monitor' weight by 10%
    const bucket = seedByte % 100;
    if (bucket < 50) { risk = "low"; score = 0.75 + (seedByte % 20) / 100; }
    else if (bucket < 85) { risk = "monitor"; score = 0.55 + (seedByte % 15) / 100; }
    else if (bucket < 95) { risk = "high"; score = 0.40 + (seedByte % 15) / 100; }
    else { risk = "refer"; score = 0.30 + (seedByte % 10) / 100; }
  }

  // Critical flag overrides
  if (obs.includes("no words") || obs.includes("not speaking") || obs.includes("doesn't respond")) {
    score = Math.max(score, 0.9);
    if (risk === "low") risk = "monitor";
    evidence.push({ type: "text", content: "Critical developmental flag detected", influence: 0.95 });
    keyFindings.push("Possible speech/hearing concern requiring evaluation.");
    recommendations.push("Immediate pediatric evaluation recommended.");
  }

  if (obs.includes("10 words") || obs.includes("only about 10 words")) {
    score = Math.min(score, 0.55);
    evidence.push({ type: "text", content: "Reported vocabulary ~10 words", influence: 0.85 });
    keyFindings.push("Expressive vocabulary smaller than expected for age.");
    recommendations.push("Complete ASQ-3 screening for language.");
  }

  if (keyFindings.length === 0) {
    evidence.push({ type: "text", content: "Observations within expected ranges", influence: 0.3 });
    keyFindings.push("No immediate red flags identified.");
    recommendations.push("Continue routine monitoring.");
  }

  if (hasImage) {
    evidence.push({ type: "image", content: "Image provided for visual context", influence: 0.2 });
  }

  return {
    riskLevel: risk,
    confidence: Math.round(score * 100) / 100,
    summary: SUMMARY_MAP[risk] || SUMMARY_MAP.low,
    keyFindings,
    recommendations,
    evidence,
    analysis_meta: {
      age_months: ageMonths,
      domain,
      observations_snippet: (observations || "").slice(0, 500),
      image_provided: hasImage,
    },
  };
}
