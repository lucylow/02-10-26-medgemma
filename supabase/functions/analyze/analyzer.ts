// supabase/functions/analyze/analyzer.ts
/**
 * Deterministic analyzer with small audit-friendly rules.
 * You can replace simulateAnalysis() with a call to an external model later.
 */

export type AnalyzeInput = {
  childAgeMonths: number;
  domain: string;
  observations: string;
  imageProvided: boolean;
};

export type EvidenceItem = { type: "text" | "image" | "model_text" | "error"; content: string; influence: number };

export async function simulateAnalysis(input: AnalyzeInput) {
  const obs = (input.observations || "").toLowerCase();
  const evidence: EvidenceItem[] = [];
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  let score = 0.8; // 0..1 higher = better (less risk)

  if (obs.includes("10 words") || obs.includes("only about 10 words") || obs.includes("about 10 words")) {
    score = 0.45;
    evidence.push({ type: "text", content: "Reported vocabulary approximately 10 words", influence: 0.9 });
    keyFindings.push("Expressive vocabulary smaller than typical for age");
    recommendations.push("Complete a standardized language screen (ASQ-3 or similar)");
    recommendations.push("Increase interactive reading and naming during routines");
    recommendations.push("Consider speech-language referral if no improvement in 4-8 weeks");
  } else if (obs.includes("not responding") || obs.includes("doesn't respond") || obs.includes("doesn't respond to name")) {
    score = 0.18;
    evidence.push({ type: "text", content: "Reported reduced responsiveness", influence: 0.95 });
    keyFindings.push("Possible hearing or attention concern");
    recommendations.push("Immediate hearing check with pediatrician");
    recommendations.push("Urgent evaluation if other regression signs present");
  } else {
    score = 0.9;
    evidence.push({ type: "text", content: "Observations show no obvious red flags", influence: 0.3 });
    keyFindings.push("No immediate red flags detected from provided text");
    recommendations.push("Continue routine monitoring and age-appropriate stimulation");
    recommendations.push("Rescreen if new concerns arise");
  }

  if (input.imageProvided) {
    evidence.push({ type: "image", content: "Image provided (visual evidence)", influence: 0.2 });
  }

  // map to risk
  let riskLevel: "low" | "medium" | "high" = "low";
  if (score < 0.3) riskLevel = "high";
  else if (score < 0.7) riskLevel = "medium";
  else riskLevel = "low";

  const summaryMap: Record<typeof riskLevel, string> = {
    high: "Screening suggests significant concerns that warrant prompt clinical evaluation.",
    medium: "Some developmental markers indicate monitoring or further screening/referral is appropriate.",
    low: "Observations are within typical ranges; continue routine monitoring."
  };

  const report = {
    riskLevel,
    confidence: Math.round(score * 100) / 100,
    summary: summaryMap[riskLevel],
    keyFindings,
    recommendations,
    evidence,
    analysis_meta: {
      age_months: input.childAgeMonths,
      domain: input.domain,
      observations_snippet: (input.observations || "").slice(0, 500),
      image_provided: input.imageProvided
    }
  };

  return report;
}
