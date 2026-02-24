/**
 * POST /medgemma-analyze — Enhanced MedGemma clinical screening v5.1
 * Uses Lovable AI (Gemini 3 Flash) with structured tool calling,
 * retry with exponential backoff, 402/429 error surfacing,
 * wearable data integration, and multi-domain ASQ-3 aligned assessment.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, supabase, errorResponse, jsonResponse,
  extractContext, recordMetric, recordAIEvent, recordAuditEvent,
  hashInput, callAIGateway, handleAIErrorResponse,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  LOVABLE_API_KEY, MODEL_ID, AGENT_VERSION, COST_PER_1K_TOKENS,
} from "../_shared/mod.ts";
import { deterministicMock } from "../_shared/mock.ts";

// ── Structured tool definition for reliable JSON extraction ─────
const SCREENING_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_screening_result",
    description: "Submit a structured pediatric developmental screening result with risk assessment, domain analysis, and clinical recommendations.",
    parameters: {
      type: "object",
      properties: {
        riskLevel: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Overall developmental risk level"
        },
        confidence: {
          type: "number",
          description: "Confidence score 0.0-1.0"
        },
        asq3Score: {
          type: "number",
          description: "Estimated ASQ-3 equivalent score (0-60)"
        },
        summary: {
          type: "string",
          description: "One-sentence clinical summary"
        },
        parentFriendlyExplanation: {
          type: "string",
          description: "Plain-language explanation for parents at grade 6 reading level"
        },
        domainBreakdown: {
          type: "object",
          description: "Per-domain risk analysis",
          additionalProperties: {
            type: "object",
            properties: {
              risk: { type: "string", enum: ["low", "medium", "high"] },
              summary: { type: "string" },
              milestonesMet: { type: "array", items: { type: "string" } },
              concerns: { type: "array", items: { type: "string" } },
            },
            required: ["risk", "summary"],
          }
        },
        keyFindings: {
          type: "array",
          items: { type: "string" },
          description: "Key clinical findings"
        },
        recommendations: {
          type: "array",
          items: { type: "string" },
          description: "Evidence-based clinical recommendations"
        },
        parentFriendlyTips: {
          type: "array",
          items: { type: "string" },
          description: "Actionable tips for parents"
        },
        referralNeeded: {
          type: "boolean",
          description: "Whether specialist referral is recommended"
        },
        referralSpecialties: {
          type: "array",
          items: { type: "string" },
          description: "Recommended specialist types if referral needed"
        },
        referralUrgency: {
          type: "string",
          enum: ["routine", "priority", "urgent"],
          description: "Referral urgency level"
        },
        rescreenIntervalDays: {
          type: "number",
          description: "Recommended days until next screening"
        },
        redFlagsToWatch: {
          type: "array",
          items: { type: "string" },
          description: "Warning signs for parents to monitor"
        },
        icdCodes: {
          type: "array",
          items: { type: "string" },
          description: "Relevant ICD-10 codes if applicable"
        },
        differentialConsiderations: {
          type: "array",
          items: { type: "string" },
          description: "Differential diagnoses or conditions to consider"
        },
        culturalConsiderations: {
          type: "string",
          description: "Any cultural or environmental factors that may influence development"
        },
      },
      required: ["riskLevel", "confidence", "summary", "keyFindings", "recommendations"],
      additionalProperties: false,
    }
  }
};

// ── System prompt ───────────────────────────────────────────────
function buildSystemPrompt(ageMonths: number, domains: string[], hasWearable: boolean): string {
  return `You are PediScreen AI v5.1 — a pediatric developmental screening assistant powered by MedGemma.
You are analyzing developmental screening data for a child aged ${ageMonths} months.
Screening domains: ${domains.length ? domains.join(", ") : "general developmental assessment"}.

CLINICAL FRAMEWORK:
- Use ASQ-3 (Ages & Stages Questionnaire) aligned developmental milestones
- Reference AAP Bright Futures periodicity schedule
- Apply CDC "Learn the Signs. Act Early." milestone framework
- Consider age-corrected milestones for premature infants when noted
- Cross-reference WHO Motor Development Study norms

RISK STRATIFICATION:
- low: Development within expected range, continue routine monitoring
- medium: Some concerns warrant closer monitoring or formal screening
- high: Significant concerns requiring clinical evaluation
- urgent: Immediate referral needed (regression, seizures, safety concerns)

CLINICAL REASONING:
- Consider comorbidities and overlapping presentations
- Account for environmental and socioeconomic factors
- Note if findings are isolated vs. across multiple domains
- Flag regression (loss of previously acquired skills) as always urgent
- Consider prematurity adjustment when relevant

${hasWearable ? `WEARABLE DATA INTEGRATION:
- Interpret HRV, sleep, activity, and SpO2 in pediatric context
- Flag autonomic dysregulation patterns relevant to neurodevelopment
- Consider activity levels relative to gross motor development
- Correlate sleep patterns with cognitive and behavioral development
- Note circadian rhythm disruptions that may affect development` : ""}

REQUIREMENTS:
- Be evidence-based, concise, and clinically appropriate
- Provide parent-friendly explanations at grade 6 reading level
- Include specific, actionable recommendations
- Flag any red flags requiring immediate attention
- Consider differential diagnoses when risk is medium or above
- Use the submit_screening_result tool to provide your structured assessment`;
}

// ── Build user prompt ──────────────────────────────────────────
function buildUserPrompt(
  ageMonths: number,
  domains: string[],
  observations: string,
  wearable?: Record<string, number>,
): string {
  let prompt = `Child age: ${ageMonths} months
Developmental domains: ${domains.length ? domains.join(", ") : "general"}
Parent/caregiver observations: ${observations}`;

  if (wearable && Object.keys(wearable).length > 0) {
    prompt += `\n\nWearable health metrics (last 7 days):`;
    if (wearable.hrvRmssd != null) prompt += `\n- Heart rate variability (RMSSD): ${wearable.hrvRmssd} ms`;
    if (wearable.stepsPerDay != null) prompt += `\n- Average steps/day: ${wearable.stepsPerDay}`;
    if (wearable.sleepDurationHours != null) prompt += `\n- Average sleep: ${wearable.sleepDurationHours} hours`;
    if (wearable.spo2Average != null) prompt += `\n- Average SpO2: ${wearable.spo2Average}%`;
    if (wearable.fallEvents != null) prompt += `\n- Fall events: ${wearable.fallEvents}`;
  }

  return prompt;
}

// ── Main handler ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const traceId = ctx.traceId;

  const rl = checkRateLimit(rateLimitKey(req), 20);
  const rlH = rateLimitHeaders(rl);

  if (!rl.allowed) {
    await recordMetric("medgemma-analyze", "rate_limited", performance.now() - start, "RATE_LIMITED");
    return errorResponse("RATE_LIMITED", "Too many requests", 429, traceId, rlH);
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, traceId, rlH);
    }

    const body = await req.json();
    const {
      childAge, age_months,
      domain, domains,
      observations,
      wearable,
      consent_id, case_id,
      embedding_b64,
    } = body;

    const ageMonths = typeof childAge === "string" ? parseInt(childAge) : (childAge ?? age_months ?? 0);
    const domainList: string[] = domains || (domain ? [domain] : []);
    const domainStr = domainList.join(",") || "general";

    if (isNaN(ageMonths) || ageMonths < 0 || ageMonths > 216) {
      return errorResponse("INVALID_AGE", "Age must be 0-216 months", 400, traceId, rlH);
    }
    if (!observations || observations.trim().length < 3) {
      return errorResponse("INVALID_OBSERVATIONS", "Observations required (min 3 chars)", 400, traceId, rlH);
    }

    // Idempotency
    const idempotencyKey = req.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("screenings").select("*").eq("screening_id", idempotencyKey).maybeSingle();
      if (existing) {
        return jsonResponse({
          success: true, screening_id: existing.screening_id,
          report: existing.report, idempotent: true, trace_id: traceId,
        }, 200, rlH);
      }
    }

    const inputHash = await hashInput(`${ageMonths}|${domainStr}|${observations}`);
    const promptHash = await hashInput(`system_v5.1|${ageMonths}|${domainStr}|${observations.slice(0, 200)}`);

    // Build deterministic baseline
    const baseline = deterministicMock(ageMonths, domainStr, observations, false, inputHash);

    // Call Lovable AI via shared gateway helper (includes retry + deadline)
    const hasWearable = !!wearable && Object.keys(wearable).length > 0;
    const systemPrompt = buildSystemPrompt(ageMonths, domainList, hasWearable);
    const userPrompt = buildUserPrompt(ageMonths, domainList, observations, wearable);

    const aiResponse = await callAIGateway(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        tools: [SCREENING_TOOL],
        tool_choice: { type: "function", function: { name: "submit_screening_result" } },
        temperature: 0.2,
        deadlineMs: 15000,
      },
    );

    // Surface 402/429 errors to client
    const aiErrorResp = handleAIErrorResponse(aiResponse, traceId, rlH);
    if (aiErrorResp) return aiErrorResp;

    let finalReport: Record<string, unknown> = { ...baseline };
    let usedModel = false;
    let isFallback = false;
    let fallbackReason: string | null = null;

    if (aiResponse.ok && aiResponse.result && !("raw_content" in aiResponse.result)) {
      usedModel = true;
      const r = aiResponse.result;
      finalReport = {
        riskLevel: r.riskLevel || baseline.riskLevel,
        confidence: Math.min(1, Math.max(0, (r.confidence as number) ?? baseline.confidence)),
        asq3Score: r.asq3Score ?? null,
        summary: r.summary || baseline.summary,
        parentFriendlyExplanation: r.parentFriendlyExplanation || null,
        keyFindings: [...new Set([...((r.keyFindings as string[]) || []), ...baseline.keyFindings])],
        recommendations: [...new Set([...((r.recommendations as string[]) || []), ...baseline.recommendations])],
        parentFriendlyTips: r.parentFriendlyTips || [],
        domainBreakdown: r.domainBreakdown || {},
        referralGuidance: {
          needed: r.referralNeeded ?? false,
          specialties: r.referralSpecialties || [],
          urgency: r.referralUrgency || "routine",
        },
        followUp: {
          rescreenIntervalDays: r.rescreenIntervalDays || 90,
          redFlagsToWatch: r.redFlagsToWatch || [],
        },
        icdCodes: r.icdCodes || [],
        differentialConsiderations: r.differentialConsiderations || [],
        culturalConsiderations: r.culturalConsiderations || null,
        evidence: baseline.evidence,
        analysis_meta: {
          ...baseline.analysis_meta,
          model_used: true,
          ai_latency_ms: aiResponse.latencyMs,
          tool_calling: true,
          wearable_provided: hasWearable,
          retried: false,
          version: "v5.1",
        },
      };
    } else {
      isFallback = true;
      fallbackReason = !LOVABLE_API_KEY
        ? "no_api_key"
        : aiResponse.error
        ? String(aiResponse.error)
        : "null_response";
    }

    // Persist screening
    const screeningId = idempotencyKey || `ps-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const { error: dbErr } = await supabase.from("screenings").insert([{
      screening_id: screeningId,
      child_age_months: ageMonths,
      domain: domainStr,
      observations,
      report: {
        ...finalReport,
        model_used: usedModel,
        fallback_to: isFallback ? "mock-v1.1" : null,
        consent_id: consent_id || null,
        case_id: case_id || null,
      },
      status: "created",
      risk_level: (finalReport.riskLevel as string) || "low",
      model_id: usedModel ? MODEL_ID : null,
      adapter_id: "medgemma_pediscreen_v1",
      confidence: (finalReport.confidence as number) || 0.5,
      input_hash: inputHash.slice(0, 16),
      embedding_hash: embedding_b64 ? (await hashInput(embedding_b64)).slice(0, 16) : null,
      prompt_hash: promptHash.slice(0, 16),
      is_mock: isFallback,
    }]);

    if (dbErr) {
      console.error("[medgemma-analyze] db insert:", dbErr);
      return errorResponse("DB_ERROR", dbErr.message, 500, traceId, rlH);
    }

    const totalLatency = Math.round(performance.now() - start);

    // Fire-and-forget telemetry
    Promise.all([
      recordMetric("medgemma-analyze", "success", totalLatency, undefined, {
        model_used: usedModel, fallback: isFallback, risk_level: finalReport.riskLevel,
        wearable: hasWearable, domains: domainStr, org_id: ctx.orgId,
      }),
      recordAIEvent({
        event_type: "medgemma_inference", screening_id: screeningId,
        model_provider: usedModel ? "google" : null, model_id: usedModel ? MODEL_ID : null,
        adapter_id: "medgemma_pediscreen_v1", model_version: "v5.1",
        input_types: ["text", ...(wearable ? ["wearable"] : [])],
        input_hash: inputHash.slice(0, 16),
        risk_level: finalReport.riskLevel, confidence: finalReport.confidence,
        fallback: isFallback, fallback_reason: fallbackReason,
        latency_ms: totalLatency, status_code: 200,
        cost_estimate_usd: usedModel ? ((aiResponse.usage?.total_tokens || 300) / 1000) * COST_PER_1K_TOKENS : 0,
        agent: "medgemma-v5.1", trace_id: traceId,
        org_id: ctx.orgId, case_id: case_id,
        metadata: { ai_latency_ms: aiResponse.latencyMs, tool_calling: usedModel, wearable: hasWearable },
      }),
      recordAuditEvent("medgemma_screening", {
        screening_id: screeningId, risk_level: finalReport.riskLevel,
        model_used: usedModel, fallback: isFallback, trace_id: traceId,
      }, screeningId),
    ]).catch((e) => console.error("[medgemma-analyze] telemetry error:", e));

    return jsonResponse({
      success: true,
      screening_id: screeningId,
      report: finalReport,
      model_used: usedModel,
      model_id: usedModel ? MODEL_ID : null,
      fallback: isFallback,
      confidence: finalReport.confidence,
      trace_id: traceId,
      version: "medgemma-v5.1",
      timestamp: new Date().toISOString(),
    }, 200, rlH);
  } catch (err) {
    console.error("[medgemma-analyze] error:", err);
    const totalLatency = performance.now() - start;
    recordMetric("medgemma-analyze", "error", totalLatency, "INTERNAL_ERROR").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
