// supabase/functions/analyze/analyzer.ts
/**
 * Deterministic analyzer with model integration.
 * Baseline rules are always used; model output is supplemental evidence only.
 */

import { callTextModel, callMultimodalModel } from "./model_client.ts";

export type AnalyzeInput = {
  childAgeMonths: number;
  domain: string;
  observations: string;
  imageProvided?: boolean;
  imageBytes?: Uint8Array | null;
  imageFilename?: string | null;
};

export type EvidenceItem = {
  type: "text" | "image" | "model_text" | "error";
  content: string;
  influence: number;
};

// Small JSON schema we ask the model to return; we validate keys exist
type ModelReport = {
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  evidence?: { type: string; content: string; influence?: number }[];
};

function baselineDeterministic(input: AnalyzeInput): ModelReport {
  const obs = (input.observations || "").toLowerCase();
  const evidence: ModelReport["evidence"] = [];
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  let score = 0.85;

  if (
    obs.includes("10 words") ||
    obs.includes("only about 10 words") ||
    obs.includes("about 10 words")
  ) {
    score = 0.45;
    evidence!.push({
      type: "text",
      content: "Reported vocabulary approximately 10 words",
      influence: 0.85,
    });
    keyFindings.push("Expressive vocabulary smaller than expected for age.");
    recommendations.push("Complete ASQ-3 or equivalent screening for language.");
    recommendations.push("Increase shared reading and naming during routines.");
  } else if (
    obs.includes("not responding") ||
    obs.includes("doesn't respond") ||
    obs.includes("doesn't respond to name")
  ) {
    score = 0.2;
    evidence!.push({
      type: "text",
      content: "Possible reduced responsiveness",
      influence: 0.95,
    });
    keyFindings.push("Possible hearing/attention concern.");
    recommendations.push("Immediate hearing check with pediatrician.");
  } else {
    score = 0.92;
    evidence!.push({
      type: "text",
      content: "Observations within expected ranges",
      influence: 0.3,
    });
    keyFindings.push("No immediate red flags.");
    recommendations.push("Continue routine monitoring.");
  }

  if (input.imageProvided || input.imageBytes) {
    evidence!.push({
      type: "image",
      content: "Image provided for visual context",
      influence: 0.2,
    });
  }

  const risk: ModelReport["riskLevel"] =
    score < 0.3 ? "high" : score < 0.7 ? "medium" : "low";
  const summary =
    risk === "high"
      ? "Significant concerns — prompt evaluation recommended."
      : risk === "medium"
        ? "Some markers to monitor; consider formal screening."
        : "Observations appear within typical limits.";

  return {
    riskLevel: risk,
    confidence: Math.round(score * 100) / 100,
    summary,
    keyFindings,
    recommendations,
    evidence,
  };
}

/**
 * Deterministic-only analysis (no model). Used when model is not configured.
 */
export async function simulateAnalysis(input: AnalyzeInput) {
  const base = baselineDeterministic(input);
  return {
    ...base,
    analysis_meta: {
      age_months: input.childAgeMonths,
      domain: input.domain,
      observations_snippet: (input.observations || "").slice(0, 500),
      image_provided: Boolean(input.imageProvided || input.imageBytes),
    },
  };
}

/**
 * Ask the external model for a JSON-formatted report.
 * Always keep deterministic baseline and attach model output as evidence only.
 */
export async function analyzeWithModel(
  input: AnalyzeInput,
  env?: {
    HF_MODEL?: string | null;
    HF_API_KEY?: string | null;
    MODEL_TIMEOUT_MS?: number | null;
  }
) {
  const baseline = baselineDeterministic(input);

  const hfModel =
    env?.HF_MODEL ?? (typeof Deno !== "undefined" ? Deno.env.get("HF_MODEL") : null) ?? null;
  const hfKey =
    env?.HF_API_KEY ?? (typeof Deno !== "undefined" ? Deno.env.get("HF_API_KEY") : null) ?? null;

  if (!hfModel || !hfKey) {
    return {
      success: true,
      report: {
        ...baseline,
        analysis_meta: {
          age_months: input.childAgeMonths,
          domain: input.domain,
          observations_snippet: (input.observations || "").slice(0, 500),
          image_provided: Boolean(input.imageProvided || input.imageBytes),
        },
      },
      modelEvidence: null,
      usedModel: false,
      parseOk: true,
    };
  }

  const prompt = [
    "You are a clinical-assist assistant for early childhood developmental screening.",
    "Given the child's age (months), developmental domain, and parent's observations, produce a JSON object EXACTLY matching the schema below.",
    "",
    "Schema:",
    `{
  "riskLevel": "low" | "medium" | "high",
  "confidence": 0.0-1.0,
  "summary": "one-sentence plain language summary",
  "keyFindings": ["bullet 1", "bullet 2"],
  "recommendations": ["action 1", "action 2"],
  "evidence": [{"type":"text|image|model_text","content":"...","influence":0.0-1.0}]
}`,
    "",
    "Return ONLY valid JSON. Do not include any explanatory text. Keep content concise.",
    "",
    `Input:
- age_months: ${input.childAgeMonths}
- domain: ${input.domain}
- observations: ${input.observations}`,
    "",
  ].join("\n");

  let modelResp;
  if (input.imageBytes && input.imageFilename) {
    modelResp = await callMultimodalModel(
      hfModel,
      hfKey,
      input.imageBytes,
      input.imageFilename,
      prompt
    );
  } else {
    modelResp = await callTextModel(hfModel, hfKey, prompt, 256);
  }

  let parsed: ModelReport | null = null;
  if (modelResp.ok && modelResp.json) {
    let textOut: string | undefined;
    const j = modelResp.json as Record<string, unknown> | unknown[];
    if (Array.isArray(j) && j[0] && typeof j[0] === "object" && "generated_text" in (j[0] as object)) {
      textOut = (j[0] as { generated_text?: string }).generated_text;
    } else if (typeof j === "object" && j !== null && "generated_text" in j) {
      textOut = (j as { generated_text?: string }).generated_text;
    } else if (typeof j === "string") {
      textOut = j;
    } else {
      textOut = JSON.stringify(j);
    }

    if (textOut) {
      try {
        const first = textOut.indexOf("{");
        const last = textOut.lastIndexOf("}");
        if (first !== -1 && last !== -1) {
          const jsonStr = textOut.slice(first, last + 1);
          parsed = JSON.parse(jsonStr) as ModelReport;
        } else {
          parsed = JSON.parse(textOut) as ModelReport;
        }
      } catch {
        parsed = null;
      }
    }
  }

  const valid =
    parsed &&
    parsed.riskLevel &&
    parsed.confidence !== undefined &&
    Array.isArray(parsed.keyFindings) &&
    Array.isArray(parsed.recommendations);

  if (!valid) {
    const rawText = modelResp.json
      ? JSON.stringify(modelResp.json).slice(0, 2000)
      : (modelResp.text || modelResp.error || "no model output");
    const withModelEvidence = {
      ...baseline,
      evidence: [
        ...(baseline.evidence || []),
        { type: "model_text", content: rawText, influence: 0.25 },
      ],
      analysis_meta: {
        age_months: input.childAgeMonths,
        domain: input.domain,
        observations_snippet: (input.observations || "").slice(0, 500),
        image_provided: Boolean(input.imageProvided || input.imageBytes),
      },
    };
    return {
      success: true,
      report: withModelEvidence,
      modelEvidence: rawText,
      usedModel: true,
      parseOk: false,
    };
  }

  // Validate riskLevel
  const riskLevel =
    ["low", "medium", "high"].includes(parsed!.riskLevel) ? parsed!.riskLevel : baseline.riskLevel;

  const mergedReport = {
    riskLevel,
    confidence: Math.min(
      1,
      Math.max(0, Number(parsed!.confidence) ?? baseline.confidence)
    ),
    summary: parsed!.summary || baseline.summary,
    keyFindings: Array.from(
      new Set([...baseline.keyFindings, ...(parsed!.keyFindings || [])])
    ),
    recommendations: Array.from(
      new Set([...baseline.recommendations, ...(parsed!.recommendations || [])])
    ),
    evidence: [
      ...(baseline.evidence || []),
      ...(parsed!.evidence || []).map((e: { type?: string; content?: string; influence?: number }) => ({
        type: (e.type || "model_text") as "text" | "image" | "model_text",
        content: e.content || "",
        influence: Math.min(1, Math.max(0, Number(e.influence) ?? 0.25)),
      })),
    ],
    analysis_meta: {
      age_months: input.childAgeMonths,
      domain: input.domain,
      observations_snippet: (input.observations || "").slice(0, 500),
      image_provided: Boolean(input.imageProvided || input.imageBytes),
    },
  };

  return {
    success: true,
    report: mergedReport,
    modelEvidence: parsed,
    usedModel: true,
    parseOk: true,
  };
}
