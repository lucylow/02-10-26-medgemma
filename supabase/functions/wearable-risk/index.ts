/**
 * POST /wearable-risk — Pediatric wearable data risk assessment v5.1.
 * Uses Lovable AI with retry, 402/429 handling,
 * and structured tool calling for wearable health interpretation.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, errorResponse, jsonResponse,
  extractContext, recordMetric, callAIGateway, handleAIErrorResponse,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  LOVABLE_API_KEY, MODEL_ID,
} from "../_shared/mod.ts";

const WEARABLE_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_wearable_assessment",
    description: "Submit wearable health data risk assessment for pediatric context",
    parameters: {
      type: "object",
      properties: {
        overallRisk: { type: "string", enum: ["normal", "monitor", "concern"] },
        confidence: { type: "number" },
        hrvAssessment: { type: "string", description: "HRV interpretation in pediatric context" },
        activityAssessment: { type: "string", description: "Activity level interpretation" },
        sleepAssessment: { type: "string", description: "Sleep pattern interpretation" },
        spo2Assessment: { type: "string", description: "SpO2 interpretation" },
        alerts: { type: "array", items: { type: "string" }, description: "Clinical alerts from wearable data" },
        recommendations: { type: "array", items: { type: "string" } },
        developmentalRelevance: { type: "string", description: "How wearable data relates to developmental screening" },
        trendInsights: { type: "string", description: "Notable trends or patterns in the data" },
      },
      required: ["overallRisk", "confidence", "alerts", "recommendations"],
      additionalProperties: false,
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const traceId = ctx.traceId;

  const rl = checkRateLimit(rateLimitKey(req), 30);
  const rlH = rateLimitHeaders(rl);
  if (!rl.allowed) return errorResponse("RATE_LIMITED", "Too many requests", 429, traceId, rlH);

  try {
    if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, traceId, rlH);

    const { metrics, childAgeMonths } = await req.json();
    if (!metrics || typeof metrics !== "object") {
      return errorResponse("INVALID_INPUT", "metrics object required", 400, traceId, rlH);
    }

    const { hrvRmssd, stepsPerDay, sleepDurationHours, spo2Average, fallEvents } = metrics;

    // Rule-based baseline (always works without AI)
    const alerts: string[] = [];
    let baseRisk = "normal";

    if (hrvRmssd != null && hrvRmssd < 20) { alerts.push("Low HRV — potential autonomic concern"); baseRisk = "concern"; }
    if (spo2Average != null && spo2Average < 94) { alerts.push("SpO2 below normal range"); baseRisk = "concern"; }
    if (spo2Average != null && spo2Average < 90) { alerts.push("SpO2 critically low — seek immediate care"); baseRisk = "concern"; }
    if (fallEvents != null && fallEvents > 3) { alerts.push("Elevated fall frequency"); baseRisk = "monitor"; }
    if (fallEvents != null && fallEvents > 8) { alerts.push("Very high fall frequency — motor assessment needed"); baseRisk = "concern"; }
    if (sleepDurationHours != null && childAgeMonths) {
      const minSleep = childAgeMonths < 12 ? 12 : childAgeMonths < 36 ? 11 : 10;
      if (sleepDurationHours < minSleep - 2) { alerts.push("Sleep duration below age-appropriate range"); baseRisk = "monitor"; }
      if (sleepDurationHours < minSleep - 4) { alerts.push("Severely insufficient sleep — may affect development"); baseRisk = "concern"; }
    }
    if (stepsPerDay != null && childAgeMonths && childAgeMonths >= 12 && stepsPerDay < 500) {
      alerts.push("Very low activity for ambulatory child"); baseRisk = "monitor";
    }

    if (!LOVABLE_API_KEY) {
      return jsonResponse({
        overallRisk: baseRisk, confidence: 0.4, alerts,
        recommendations: alerts.length ? ["Discuss wearable findings with pediatrician"] : ["Wearable metrics within normal ranges"],
        model_used: false, trace_id: traceId,
      }, 200, rlH);
    }

    const metricsSummary = Object.entries(metrics)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    const aiResult = await callAIGateway(
      [
        {
          role: "system",
          content: `You are a pediatric health specialist interpreting wearable device data for a ${childAgeMonths || "young"}-month-old child.

INSTRUCTIONS:
- Assess each metric against age-appropriate pediatric norms
- Consider interactions between metrics (e.g., poor sleep + low activity)
- Correlate findings with developmental implications
- Provide actionable clinical recommendations
- Note any data that requires immediate medical attention

Use the submit_wearable_assessment tool to provide your structured assessment.`,
        },
        { role: "user", content: `Wearable metrics (7-day average): ${metricsSummary}\nChild age: ${childAgeMonths || "unknown"} months\nRule-based alerts already detected: ${alerts.length ? alerts.join("; ") : "none"}` },
      ],
      {
        tools: [WEARABLE_TOOL],
        tool_choice: { type: "function", function: { name: "submit_wearable_assessment" } },
        temperature: 0.1,
        deadlineMs: 10000,
      },
    );

    // Surface 402/429 to client
    const aiErrorResp = handleAIErrorResponse(aiResult, traceId, rlH);
    if (aiErrorResp) {
      // Still return rule-based results with the error info
      return jsonResponse({
        overallRisk: baseRisk, confidence: 0.4, alerts,
        recommendations: ["Discuss findings with pediatrician"],
        model_used: false, trace_id: traceId,
        ai_error: aiResult.status === 429 ? "rate_limited" : "payment_required",
      }, 200, rlH);
    }

    let result: Record<string, unknown> = { overallRisk: baseRisk, confidence: 0.4, alerts, recommendations: [] };

    if (aiResult.ok && aiResult.result && !("raw_content" in aiResult.result)) {
      result = aiResult.result;
      // Merge rule-based alerts
      const aiAlerts = (result.alerts as string[]) || [];
      result.alerts = [...new Set([...alerts, ...aiAlerts])];
    }

    const totalLatency = Math.round(performance.now() - start);
    recordMetric("wearable-risk", "success", totalLatency, undefined, {
      ai_latency_ms: aiResult.latencyMs,
      model_used: aiResult.ok,
    }).catch(() => {});

    return jsonResponse({ ...result, model_used: aiResult.ok, trace_id: traceId }, 200, rlH);
  } catch (err) {
    console.error("[wearable-risk] error:", err);
    recordMetric("wearable-risk", "error", performance.now() - start, "INTERNAL_ERROR").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
