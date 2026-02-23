/**
 * POST /parent-notes — AI-powered parent concern analysis.
 * Uses Lovable AI to analyze free-text parent observations for
 * developmental red flags, urgency assessment, and guided follow-up.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, corsResponse, errorResponse, jsonResponse,
  extractContext, recordMetric, withDeadline,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  LOVABLE_API_KEY, MODEL_ID,
} from "../_shared/mod.ts";

const ANALYSIS_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_parent_analysis",
    description: "Submit structured analysis of parent developmental concerns",
    parameters: {
      type: "object",
      properties: {
        redFlags: {
          type: "array",
          items: { type: "string" },
          description: "Identified developmental red flags from parent observations"
        },
        urgency: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Overall urgency of concerns"
        },
        confidence: {
          type: "number",
          description: "Confidence in assessment 0.0-1.0"
        },
        suggestedDomains: {
          type: "array",
          items: { type: "string", enum: ["communication", "gross_motor", "fine_motor", "problem_solving", "personal_social", "vision"] },
          description: "Developmental domains that should be formally screened"
        },
        parentGuidance: {
          type: "string",
          description: "Brief reassuring guidance for the parent"
        },
        followUpQuestions: {
          type: "array",
          items: { type: "string" },
          description: "Follow-up questions to ask the parent for better assessment"
        },
      },
      required: ["redFlags", "urgency", "confidence", "suggestedDomains", "parentGuidance"],
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

    const { notes, childAgeMonths } = await req.json();
    if (!notes || notes.trim().length < 5) {
      return errorResponse("INVALID_INPUT", "notes must be at least 5 characters", 400, traceId, rlH);
    }

    if (!LOVABLE_API_KEY) {
      // Return safe fallback
      return jsonResponse({
        redFlags: [],
        urgency: "low",
        confidence: 0.3,
        suggestedDomains: ["communication", "gross_motor"],
        parentGuidance: "Thank you for sharing your observations. Based on what you've described, we recommend completing a formal screening to get a clearer picture.",
        followUpQuestions: ["How does your child communicate their needs?", "Can your child walk independently?"],
        model_used: false,
        trace_id: traceId,
      }, 200, rlH);
    }

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
              content: `You are a pediatric developmental specialist assistant. Analyze parent-reported developmental concerns for children${childAgeMonths ? ` (child age: ${childAgeMonths} months)` : ""}.
Identify red flags, assess urgency, suggest which developmental domains need formal screening, and provide reassuring guidance.
Be empathetic and evidence-based. Use the submit_parent_analysis tool.`,
            },
            { role: "user", content: notes },
          ],
          tools: [ANALYSIS_TOOL],
          tool_choice: { type: "function", function: { name: "submit_parent_analysis" } },
          temperature: 0.2,
        }),
      }),
      8000,
    );

    if (!resp.ok) {
      if (resp.status === 429) return errorResponse("RATE_LIMITED", "AI rate limit exceeded", 429, traceId, rlH);
      if (resp.status === 402) return errorResponse("PAYMENT_REQUIRED", "AI credits exhausted", 402, traceId, rlH);
      console.error("[parent-notes] AI error:", resp.status);
      return errorResponse("AI_ERROR", "AI service error", 502, traceId, rlH);
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result: Record<string, unknown>;

    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      result = {
        redFlags: [], urgency: "low", confidence: 0.3,
        suggestedDomains: ["communication"],
        parentGuidance: "We recommend completing a formal developmental screening.",
      };
    }

    const totalLatency = Math.round(performance.now() - start);
    recordMetric("parent-notes", "success", totalLatency).catch(() => {});

    return jsonResponse({ ...result, model_used: true, trace_id: traceId }, 200, rlH);
  } catch (err) {
    console.error("[parent-notes] error:", err);
    recordMetric("parent-notes", "error", performance.now() - start, "INTERNAL_ERROR").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
