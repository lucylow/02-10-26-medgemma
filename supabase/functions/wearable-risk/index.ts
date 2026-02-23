/**
 * POST /wearable-risk — Pediatric wearable data risk assessment.
 * Uses Lovable AI to interpret wearable health metrics in
 * pediatric developmental context.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, corsResponse, errorResponse, jsonResponse,
  extractContext, recordMetric, withDeadline,
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
        alerts: { type: "array", items: { type: "string" }, description: "Clinical alerts from wearable data" },
        recommendations: { type: "array", items: { type: "string" } },
        developmentalRelevance: { type: "string", description: "How wearable data relates to developmental screening" },
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

    // Rule-based baseline (works without AI)
    const alerts: string[] = [];
    let baseRisk = "normal";

    if (hrvRmssd != null && hrvRmssd < 20) { alerts.push("Low HRV — potential autonomic concern"); baseRisk = "concern"; }
    if (spo2Average != null && spo2Average < 94) { alerts.push("SpO2 below normal range"); baseRisk = "concern"; }
    if (fallEvents != null && fallEvents > 3) { alerts.push("Elevated fall frequency"); baseRisk = "monitor"; }
    if (sleepDurationHours != null && childAgeMonths) {
      const minSleep = childAgeMonths < 12 ? 12 : childAgeMonths < 36 ? 11 : 10;
      if (sleepDurationHours < minSleep - 2) { alerts.push("Sleep duration below age-appropriate range"); baseRisk = "monitor"; }
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

    const resp = await withDeadline(
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [
            {
              role: "system",
              content: `You are a pediatric health specialist interpreting wearable device data for a ${childAgeMonths || "young"}-month-old child.
Assess the health metrics in a pediatric developmental context. Consider age-appropriate norms.
Use the submit_wearable_assessment tool.`,
            },
            { role: "user", content: `Wearable metrics: ${metricsSummary}` },
          ],
          tools: [WEARABLE_TOOL],
          tool_choice: { type: "function", function: { name: "submit_wearable_assessment" } },
          temperature: 0.1,
        }),
      }),
      8000,
    );

    if (!resp.ok) {
      if (resp.status === 429) return errorResponse("RATE_LIMITED", "AI rate limit exceeded", 429, traceId, rlH);
      if (resp.status === 402) return errorResponse("PAYMENT_REQUIRED", "AI credits exhausted", 402, traceId, rlH);
      // Return rule-based fallback
      return jsonResponse({
        overallRisk: baseRisk, confidence: 0.4, alerts,
        recommendations: ["Discuss findings with pediatrician"],
        model_used: false, trace_id: traceId,
      }, 200, rlH);
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result: Record<string, unknown> = { overallRisk: baseRisk, confidence: 0.4, alerts, recommendations: [] };

    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
      // Merge rule-based alerts
      const aiAlerts = (result.alerts as string[]) || [];
      result.alerts = [...new Set([...alerts, ...aiAlerts])];
    }

    const totalLatency = Math.round(performance.now() - start);
    recordMetric("wearable-risk", "success", totalLatency).catch(() => {});

    return jsonResponse({ ...result, model_used: true, trace_id: traceId }, 200, rlH);
  } catch (err) {
    console.error("[wearable-risk] error:", err);
    recordMetric("wearable-risk", "error", performance.now() - start, "INTERNAL_ERROR").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
