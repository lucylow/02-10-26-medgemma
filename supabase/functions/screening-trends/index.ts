/**
 * POST /screening-trends — AI-powered longitudinal screening trend analysis.
 * Compares multiple screenings over time and identifies developmental trajectory.
 */
import {
  corsResponse, errorResponse, jsonResponse,
  extractContext, recordMetric, callAIGateway, handleAIErrorResponse,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  supabase, MODEL_ID, AGENT_VERSION,
} from "../_shared/mod.ts";

const TREND_TOOL = {
  type: "function" as const,
  function: {
    name: "analyze_trends",
    description: "Analyze developmental screening trends over time",
    parameters: {
      type: "object",
      properties: {
        trajectory: { type: "string", enum: ["improving", "stable", "declining", "mixed"], description: "Overall developmental trajectory" },
        confidence: { type: "number" },
        summary: { type: "string", description: "2-3 sentence clinical summary of trends" },
        domainTrends: {
          type: "array",
          items: {
            type: "object",
            properties: {
              domain: { type: "string" },
              trend: { type: "string", enum: ["improving", "stable", "declining"] },
              note: { type: "string" },
            },
            required: ["domain", "trend", "note"],
          },
        },
        actionItems: { type: "array", items: { type: "string" } },
        positiveIndicators: { type: "array", items: { type: "string" } },
        concernIndicators: { type: "array", items: { type: "string" } },
      },
      required: ["trajectory", "confidence", "summary", "domainTrends", "actionItems"],
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

    const { screenings } = await req.json();

    // Accept either passed-in screenings or fetch recent from DB
    let screeningData = screenings;
    if (!screeningData || !Array.isArray(screeningData) || screeningData.length < 2) {
      // Try fetching from database
      const { data } = await supabase
        .from("screenings")
        .select("screening_id, child_age_months, domain, observations, report, created_at, risk_level, confidence")
        .order("created_at", { ascending: true })
        .limit(20);

      screeningData = data;
      if (!screeningData || screeningData.length < 2) {
        return errorResponse("INSUFFICIENT_DATA", "At least 2 screenings needed for trend analysis", 400, traceId, rlH);
      }
    }

    // Build concise summary for AI
    const screeningSummaries = screeningData.map((s: Record<string, unknown>, i: number) => {
      const report = s.report as Record<string, unknown> | null;
      return `#${i + 1} (Age: ${s.child_age_months}mo, ${s.created_at}): Domain=${s.domain}, Risk=${report?.riskLevel || s.risk_level || "unknown"}, Confidence=${report?.confidence || s.confidence || "N/A"}, Key: ${(report?.keyFindings as string[])?.slice(0, 2)?.join("; ") || s.observations || "N/A"}`;
    }).join("\n");

    const aiResult = await callAIGateway(
      [
        {
          role: "system",
          content: `You are a developmental pediatrician analyzing longitudinal screening data. 
Compare screenings chronologically and identify:
1. Overall trajectory (improving/stable/declining/mixed)
2. Domain-specific trends
3. Positive developmental indicators
4. Areas of concern requiring intervention
5. Actionable next steps
Be evidence-based and reference AAP guidelines.`,
        },
        { role: "user", content: `Screening history (${screeningData.length} screenings):\n${screeningSummaries}` },
      ],
      {
        tools: [TREND_TOOL],
        tool_choice: { type: "function", function: { name: "analyze_trends" } },
        temperature: 0.2,
        deadlineMs: 15000,
      },
    );

    const aiError = handleAIErrorResponse(aiResult, traceId, rlH);
    if (aiError) return aiError;

    if (aiResult.ok && aiResult.result && !("raw_content" in aiResult.result)) {
      await recordMetric("screening-trends", "ok", Math.round(performance.now() - start));
      return jsonResponse({
        ...aiResult.result,
        screeningCount: screeningData.length,
        model_used: true,
        trace_id: traceId,
        version: AGENT_VERSION,
      }, 200, rlH);
    }

    // Fallback
    return jsonResponse({
      trajectory: "stable",
      confidence: 0.3,
      summary: `${screeningData.length} screenings analyzed. Unable to generate AI-powered trend analysis.`,
      domainTrends: [],
      actionItems: ["Continue regular screening schedule", "Discuss trends with pediatrician"],
      screeningCount: screeningData.length,
      model_used: false,
      trace_id: traceId,
    }, 200, rlH);
  } catch (err) {
    console.error("[screening-trends] error:", err);
    await recordMetric("screening-trends", "error", Math.round(performance.now() - start), String(err));
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
