/**
 * POST /parent-notes — AI-powered parent concern analysis v5.1.
 * Uses Lovable AI with retry, 402/429 error surfacing,
 * and structured tool calling for developmental red flags.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, errorResponse, jsonResponse,
  extractContext, recordMetric, callAIGateway, handleAIErrorResponse,
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
          items: { type: "string", enum: ["communication", "gross_motor", "fine_motor", "problem_solving", "personal_social", "vision", "hearing", "feeding"] },
          description: "Developmental domains that should be formally screened"
        },
        parentGuidance: {
          type: "string",
          description: "Brief reassuring guidance for the parent at grade 6 reading level"
        },
        followUpQuestions: {
          type: "array",
          items: { type: "string" },
          description: "Follow-up questions to ask the parent for better assessment"
        },
        supportResources: {
          type: "array",
          items: { type: "string" },
          description: "Helpful resources or services the parent can access"
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
      return jsonResponse({
        redFlags: [],
        urgency: "low",
        confidence: 0.3,
        suggestedDomains: ["communication", "gross_motor"],
        parentGuidance: "Thank you for sharing your observations. Based on what you've described, we recommend completing a formal screening to get a clearer picture.",
        followUpQuestions: ["How does your child communicate their needs?", "Can your child walk independently?"],
        supportResources: [],
        model_used: false,
        trace_id: traceId,
      }, 200, rlH);
    }

    const aiResult = await callAIGateway(
      [
        {
          role: "system",
          content: `You are a pediatric developmental specialist assistant. Analyze parent-reported developmental concerns for children${childAgeMonths ? ` (child age: ${childAgeMonths} months)` : ""}.

INSTRUCTIONS:
- Identify red flags using CDC/AAP developmental milestone guidelines
- Assess urgency based on severity, number of concerns, and child's age
- Suggest which developmental domains need formal screening (include hearing and feeding when relevant)
- Provide reassuring, empathetic guidance at grade 6 reading level
- Generate thoughtful follow-up questions to clarify concerns
- Suggest relevant support resources (Early Intervention, Help Me Grow, etc.)

Use the submit_parent_analysis tool to provide your structured assessment.`,
        },
        { role: "user", content: notes },
      ],
      {
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "function", function: { name: "submit_parent_analysis" } },
        temperature: 0.2,
        deadlineMs: 10000,
      },
    );

    // Surface 402/429 to client
    const aiErrorResp = handleAIErrorResponse(aiResult, traceId, rlH);
    if (aiErrorResp) return aiErrorResp;

    let result: Record<string, unknown>;

    if (aiResult.ok && aiResult.result && !("raw_content" in aiResult.result)) {
      result = aiResult.result;
    } else {
      result = {
        redFlags: [], urgency: "low", confidence: 0.3,
        suggestedDomains: ["communication"],
        parentGuidance: "We recommend completing a formal developmental screening.",
        followUpQuestions: [],
        supportResources: [],
      };
    }

    const totalLatency = Math.round(performance.now() - start);
    recordMetric("parent-notes", "success", totalLatency, undefined, {
      ai_latency_ms: aiResult.latencyMs,
      model_used: aiResult.ok,
    }).catch(() => {});

    return jsonResponse({
      ...result,
      model_used: aiResult.ok,
      trace_id: traceId,
    }, 200, rlH);
  } catch (err) {
    console.error("[parent-notes] error:", err);
    recordMetric("parent-notes", "error", performance.now() - start, "INTERNAL_ERROR").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
