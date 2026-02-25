/**
 * POST /referral-letter — AI-generated pediatric referral letter.
 * Takes screening results and generates a professional referral letter
 * for specialists (SLP, OT, PT, Early Intervention).
 */
import {
  corsResponse, corsHeaders, errorResponse, jsonResponse,
  extractContext, recordMetric, callAIGateway, handleAIErrorResponse,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  MODEL_ID, AGENT_VERSION,
} from "../_shared/mod.ts";

const REFERRAL_TOOL = {
  type: "function" as const,
  function: {
    name: "generate_referral",
    description: "Generate a structured pediatric referral letter",
    parameters: {
      type: "object",
      properties: {
        letterBody: { type: "string", description: "Full referral letter text, professional tone, 150-300 words" },
        referralTo: { type: "string", description: "Specialty being referred to" },
        urgency: { type: "string", enum: ["routine", "priority", "urgent"] },
        reasonForReferral: { type: "string", description: "Concise reason (1-2 sentences)" },
        relevantHistory: { type: "array", items: { type: "string" }, description: "Key clinical points" },
        requestedEvaluations: { type: "array", items: { type: "string" }, description: "Specific evaluations requested" },
        icdCodes: { type: "array", items: { type: "string" } },
      },
      required: ["letterBody", "referralTo", "urgency", "reasonForReferral", "relevantHistory", "requestedEvaluations"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const traceId = ctx.traceId;
  const rl = checkRateLimit(rateLimitKey(req), 20);
  const rlH = rateLimitHeaders(rl);
  if (!rl.allowed) return errorResponse("RATE_LIMITED", "Too many requests", 429, traceId, rlH);

  try {
    if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, traceId, rlH);

    const { childAgeMonths, specialty, screeningSummary, riskLevel, recommendations, observations } = await req.json();

    if (!specialty || !screeningSummary) {
      return errorResponse("INVALID_INPUT", "specialty and screeningSummary required", 400, traceId, rlH);
    }

    const aiResult = await callAIGateway(
      [
        {
          role: "system",
          content: `You are a pediatrician generating a referral letter to ${specialty}. 
The child is ${childAgeMonths || "unknown age"} months old.
Risk level: ${riskLevel || "not specified"}.
Write a professional, HIPAA-mindful letter. Do NOT include real patient names or identifiers — use placeholders like [Patient Name], [DOB], [Parent/Guardian Name].
Include today's date as [Date].
Reference AAP/CDC guidelines where appropriate.`,
        },
        {
          role: "user",
          content: `Screening summary: ${screeningSummary}\nObservations: ${observations || "N/A"}\nRecommendations: ${JSON.stringify(recommendations || [])}`,
        },
      ],
      {
        tools: [REFERRAL_TOOL],
        tool_choice: { type: "function", function: { name: "generate_referral" } },
        temperature: 0.2,
        deadlineMs: 15000,
      },
    );

    const aiError = handleAIErrorResponse(aiResult, traceId, rlH);
    if (aiError) return aiError;

    if (aiResult.ok && aiResult.result && !("raw_content" in aiResult.result)) {
      await recordMetric("referral-letter", "ok", Math.round(performance.now() - start));
      return jsonResponse({ ...aiResult.result, model_used: true, trace_id: traceId, version: AGENT_VERSION }, 200, rlH);
    }

    // Fallback
    return jsonResponse({
      letterBody: `Dear ${specialty} Colleague,\n\nI am referring a ${childAgeMonths || "young"}-month-old patient for evaluation.\n\nScreening Summary: ${screeningSummary}\n\nThank you for your prompt attention.\n\nSincerely,\n[Referring Clinician]`,
      referralTo: specialty,
      urgency: riskLevel === "high" ? "urgent" : "routine",
      reasonForReferral: screeningSummary,
      relevantHistory: [],
      requestedEvaluations: ["Comprehensive developmental evaluation"],
      model_used: false,
      trace_id: traceId,
    }, 200, rlH);
  } catch (err) {
    console.error("[referral-letter] error:", err);
    await recordMetric("referral-letter", "error", Math.round(performance.now() - start), String(err));
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
