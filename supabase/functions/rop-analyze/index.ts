/**
 * POST /rop-analyze — ROP (Retinopathy of Prematurity) detection v5.1.
 * Uses Lovable AI (Gemini 3 Flash) with structured tool calling,
 * rate limiting, retry with backoff, and 402/429 error surfacing.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, supabase, errorResponse, jsonResponse,
  extractContext, recordMetric, recordAIEvent, recordAuditEvent,
  callAIGateway, handleAIErrorResponse,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  LOVABLE_API_KEY, MODEL_ID_VISION,
} from "../_shared/mod.ts";

// ── Structured tool for reliable JSON extraction ────────────────
const ROP_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_rop_analysis",
    description: "Submit structured ROP retinal analysis with zone, stage, plus disease, risk assessment, and clinical recommendations.",
    parameters: {
      type: "object",
      properties: {
        zone: {
          type: "string",
          enum: ["1", "2", "3"],
          description: "ICROP-3 zone classification"
        },
        stage: {
          type: "string",
          enum: ["normal", "1", "2", "3", "4", "5"],
          description: "ROP stage (normal = no ROP)"
        },
        plusDisease: {
          type: "boolean",
          description: "Whether plus disease (vascular tortuosity/dilation) is present"
        },
        aggressivePosterior: {
          type: "boolean",
          description: "Whether aggressive posterior ROP (A-ROP) is detected"
        },
        confidence: {
          type: "number",
          description: "Confidence score 0.0-1.0"
        },
        riskLevel: {
          type: "string",
          enum: ["normal", "pre-threshold", "threshold", "urgent"],
          description: "Clinical risk classification"
        },
        findings: {
          type: "array",
          items: { type: "string" },
          description: "List of clinical findings from the retinal image"
        },
        recommendation: {
          type: "string",
          description: "Clinical recommendation and next steps"
        },
        urgencyHours: {
          type: "number",
          description: "If urgent, recommended treatment window in hours (null if not urgent)"
        },
        icd10: {
          type: "string",
          description: "Relevant ICD-10 code (e.g., H35.10 for ROP)"
        },
        differentialDiagnoses: {
          type: "array",
          items: { type: "string" },
          description: "Differential diagnoses to consider"
        },
        qualityAssessment: {
          type: "string",
          description: "Assessment of image quality and any limitations"
        },
      },
      required: ["zone", "stage", "plusDisease", "confidence", "riskLevel", "findings", "recommendation", "icd10"],
      additionalProperties: false,
    }
  }
};

// ── System prompt ───────────────────────────────────────────────
function buildSystemPrompt(gestationalAge?: number, birthWeight?: number, postnatalAge?: number): string {
  let context = "";
  if (gestationalAge) context += `\nGestational age: ${gestationalAge} weeks.`;
  if (birthWeight) context += `\nBirth weight: ${birthWeight}g.`;
  if (postnatalAge) context += `\nPostnatal age: ${postnatalAge} weeks.`;

  return `You are PediScreen ROP Analyzer v5.1 — a clinical-grade AI for Retinopathy of Prematurity screening.
${context}

CLASSIFICATION FRAMEWORK (ICROP-3, 2021):
- Zone 1: Posterior pole, centered on optic disc
- Zone 2: From Zone 1 border to nasal ora serrata
- Zone 3: Remaining temporal crescent
- Stages 1-5: Ridge → fibrovascular proliferation → partial/total detachment
- Plus disease: ≥2 quadrants of venous dilation and arteriolar tortuosity
- A-ROP: Aggressive posterior ROP with prominent plus disease in Zone 1/posterior Zone 2

TREATMENT CRITERIA:
- Type 1 ROP (treat within 48-72h): Zone 1 any stage with plus | Zone 1 Stage 3 | Zone 2 Stage 2-3 with plus
- Type 2 ROP (observe): Zone 1 Stage 1-2 without plus | Zone 2 Stage 3 without plus
- A-ROP: Immediate referral

REQUIREMENTS:
- Be conservative: when uncertain, recommend specialist review
- Assess image quality and note limitations
- Consider gestational age and birth weight risk factors
- Provide specific ICD-10 codes (H35.10-H35.17)

Use the submit_rop_analysis tool to provide your structured assessment.`;
}

// ── Mock fallback ───────────────────────────────────────────────
function mockROPResult(): Record<string, unknown> {
  return {
    zone: "2",
    stage: "1",
    plus_disease: false,
    aggressive_posterior: false,
    confidence: 0.45,
    risk_level: "pre-threshold",
    findings: [
      "Demarcation line visible in Zone 2 (Stage 1 ROP)",
      "No plus disease — vessels appear normal caliber",
      "Image quality adequate for screening assessment",
    ],
    recommendation: "Type 2 ROP — serial examinations recommended every 1-2 weeks. Monitor for progression to plus disease or Stage 3.",
    urgency_hours: null,
    icd10: "H35.11",
    differential_diagnoses: ["Familial exudative vitreoretinopathy (FEVR)", "Persistent fetal vasculature"],
    quality_assessment: "Mock analysis — no real image analyzed. Submit retinal fundus image for clinical assessment.",
    is_mock: true,
    model: "fallback-mock",
  };
}

// ── Main handler ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const traceId = ctx.traceId;

  const rl = checkRateLimit(rateLimitKey(req), 15);
  const rlH = rateLimitHeaders(rl);
  if (!rl.allowed) {
    await recordMetric("rop-analyze", "rate_limited", performance.now() - start, "RATE_LIMITED");
    return errorResponse("RATE_LIMITED", "Too many requests", 429, traceId, rlH);
  }

  try {
    if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, traceId, rlH);

    const body = await req.json();
    const { image_b64, gestational_age_weeks, birth_weight_grams, postnatal_age_weeks, case_id } = body;

    // Build messages with optional vision input
    const systemPrompt = buildSystemPrompt(gestational_age_weeks, birth_weight_grams, postnatal_age_weeks);
    const userContent: unknown[] = [];

    if (image_b64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${image_b64}` },
      });
      userContent.push({
        type: "text",
        text: "Analyze this retinal fundus image for Retinopathy of Prematurity. Use the submit_rop_analysis tool.",
      });
    } else {
      userContent.push({
        type: "text",
        text: "No retinal image provided. Based on the clinical context, provide a risk assessment framework. Use the submit_rop_analysis tool.",
      });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    // Call AI with tool calling
    const aiResult = await callAIGateway(
      messages as { role: string; content: string }[],
      {
        model: MODEL_ID_VISION,
        tools: [ROP_TOOL],
        tool_choice: { type: "function", function: { name: "submit_rop_analysis" } },
        temperature: 0.1,
        max_tokens: 1500,
        deadlineMs: 20000,
      },
    );

    // Surface 402/429 errors
    const aiErrorResp = handleAIErrorResponse(aiResult, traceId, rlH);
    if (aiErrorResp) return aiErrorResp;

    let analysis: Record<string, unknown>;
    let usedMock = false;

    if (aiResult.ok && aiResult.result && !("raw_content" in aiResult.result)) {
      const r = aiResult.result;
      analysis = {
        zone: r.zone,
        stage: r.stage,
        plus_disease: r.plusDisease ?? false,
        aggressive_posterior: r.aggressivePosterior ?? false,
        confidence: Math.min(1, Math.max(0, (r.confidence as number) ?? 0.5)),
        risk_level: r.riskLevel,
        findings: r.findings || [],
        recommendation: r.recommendation || "",
        urgency_hours: r.urgencyHours ?? null,
        icd10: r.icd10 || "H35.10",
        differential_diagnoses: r.differentialDiagnoses || [],
        quality_assessment: r.qualityAssessment || null,
        is_mock: false,
        model: MODEL_ID_VISION,
      };
    } else {
      analysis = mockROPResult();
      usedMock = true;
    }

    const totalLatency = Math.round(performance.now() - start);

    // Fire-and-forget telemetry
    Promise.all([
      recordMetric("rop-analyze", "success", totalLatency, undefined, {
        model_used: !usedMock, risk_level: analysis.risk_level,
        has_image: !!image_b64, gestational_age_weeks, ai_latency_ms: aiResult.latencyMs,
      }),
      recordAIEvent({
        event_type: "rop_analysis",
        case_id: case_id ?? null,
        model_id: usedMock ? "fallback-mock" : MODEL_ID_VISION,
        model_provider: "google",
        model_version: "v5.1",
        confidence: typeof analysis.confidence === "number" ? analysis.confidence : null,
        risk_level: typeof analysis.risk_level === "string" ? analysis.risk_level : null,
        is_mock: usedMock,
        fallback: usedMock,
        fallback_reason: usedMock ? (!LOVABLE_API_KEY ? "no_api_key" : "ai_failure") : null,
        trace_id: traceId,
        latency_ms: totalLatency,
        agent: "rop-v5.1",
        metadata: {
          zone: analysis.zone, stage: analysis.stage, plus_disease: analysis.plus_disease,
          gestational_age_weeks, birth_weight_grams, has_image: !!image_b64,
          tool_calling: !usedMock, ai_latency_ms: aiResult.latencyMs,
        },
      }),
      recordAuditEvent("rop_screening", {
        risk_level: analysis.risk_level, model_used: !usedMock,
        trace_id: traceId, has_image: !!image_b64,
      }),
    ]).catch((e) => console.error("[rop-analyze] telemetry error:", e));

    return jsonResponse({
      ...analysis,
      trace_id: traceId,
      version: "rop-v5.1",
      timestamp: new Date().toISOString(),
    }, 200, rlH);
  } catch (err) {
    console.error("[rop-analyze] error:", err);
    const totalLatency = performance.now() - start;
    recordMetric("rop-analyze", "error", totalLatency, "INTERNAL_ERROR").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
