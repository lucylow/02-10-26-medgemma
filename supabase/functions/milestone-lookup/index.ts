/**
 * POST /milestone-lookup — AI-powered developmental milestone reference.
 * Returns age-appropriate milestones, expected ranges, and screening
 * guidance using CDC/AAP/WHO guidelines via Lovable AI.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, errorResponse, jsonResponse,
  extractContext, recordMetric, callAIGateway, handleAIErrorResponse,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  LOVABLE_API_KEY,
} from "../_shared/mod.ts";

const MILESTONE_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_milestones",
    description: "Submit age-appropriate developmental milestones and screening guidance",
    parameters: {
      type: "object",
      properties: {
        ageRange: {
          type: "string",
          description: "The age range these milestones apply to (e.g., '12-18 months')"
        },
        milestones: {
          type: "object",
          description: "Milestones by developmental domain",
          properties: {
            communication: {
              type: "object",
              properties: {
                expected: { type: "array", items: { type: "string" } },
                redFlags: { type: "array", items: { type: "string" } },
              },
            },
            grossMotor: {
              type: "object",
              properties: {
                expected: { type: "array", items: { type: "string" } },
                redFlags: { type: "array", items: { type: "string" } },
              },
            },
            fineMotor: {
              type: "object",
              properties: {
                expected: { type: "array", items: { type: "string" } },
                redFlags: { type: "array", items: { type: "string" } },
              },
            },
            problemSolving: {
              type: "object",
              properties: {
                expected: { type: "array", items: { type: "string" } },
                redFlags: { type: "array", items: { type: "string" } },
              },
            },
            personalSocial: {
              type: "object",
              properties: {
                expected: { type: "array", items: { type: "string" } },
                redFlags: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
        screeningTools: {
          type: "array",
          items: { type: "string" },
          description: "Recommended formal screening tools for this age"
        },
        parentActivities: {
          type: "array",
          items: { type: "string" },
          description: "Activities parents can do to support development"
        },
        nextScreeningAge: {
          type: "number",
          description: "Recommended next screening age in months"
        },
        sources: {
          type: "array",
          items: { type: "string" },
          description: "Clinical guideline sources referenced"
        },
      },
      required: ["ageRange", "milestones", "screeningTools", "parentActivities"],
      additionalProperties: false,
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const traceId = ctx.traceId;

  const rl = checkRateLimit(rateLimitKey(req), 40);
  const rlH = rateLimitHeaders(rl);
  if (!rl.allowed) return errorResponse("RATE_LIMITED", "Too many requests", 429, traceId, rlH);

  try {
    if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, traceId, rlH);

    const { ageMonths, domains } = await req.json();
    if (ageMonths == null || isNaN(ageMonths) || ageMonths < 0 || ageMonths > 216) {
      return errorResponse("INVALID_AGE", "ageMonths must be 0-216", 400, traceId, rlH);
    }

    if (!LOVABLE_API_KEY) {
      // Static fallback for common ages
      return jsonResponse({
        ageRange: `${ageMonths} months`,
        milestones: getStaticMilestones(ageMonths),
        screeningTools: ["ASQ-3", "M-CHAT-R/F (if 16-30 months)"],
        parentActivities: ["Read together daily", "Play interactive games", "Encourage exploration"],
        model_used: false,
        trace_id: traceId,
      }, 200, rlH);
    }

    const domainFocus = domains?.length ? `Focus especially on: ${domains.join(", ")}.` : "";

    const aiResult = await callAIGateway(
      [
        {
          role: "system",
          content: `You are a pediatric developmental specialist providing evidence-based milestone guidance.

GUIDELINES TO REFERENCE:
- CDC "Learn the Signs. Act Early." milestones (2022 update)
- AAP Bright Futures periodicity schedule
- ASQ-3 age-specific developmental expectations
- WHO Motor Development Study norms

For each domain, provide:
1. Expected milestones for the specific age
2. Red flags that warrant further evaluation
Keep milestones specific, observable, and parent-friendly.
${domainFocus}

Use the submit_milestones tool.`,
        },
        { role: "user", content: `Child age: ${ageMonths} months. Provide age-appropriate developmental milestones and screening guidance.` },
      ],
      {
        tools: [MILESTONE_TOOL],
        tool_choice: { type: "function", function: { name: "submit_milestones" } },
        temperature: 0.1,
        deadlineMs: 10000,
      },
    );

    const aiErrorResp = handleAIErrorResponse(aiResult, traceId, rlH);
    if (aiErrorResp) return aiErrorResp;

    let result: Record<string, unknown>;

    if (aiResult.ok && aiResult.result && !("raw_content" in aiResult.result)) {
      result = aiResult.result;
    } else {
      result = {
        ageRange: `${ageMonths} months`,
        milestones: getStaticMilestones(ageMonths),
        screeningTools: ["ASQ-3"],
        parentActivities: ["Read together daily", "Encourage exploration"],
      };
    }

    const totalLatency = Math.round(performance.now() - start);
    recordMetric("milestone-lookup", "success", totalLatency).catch(() => {});

    return jsonResponse({ ...result, model_used: aiResult.ok, trace_id: traceId }, 200, rlH);
  } catch (err) {
    console.error("[milestone-lookup] error:", err);
    recordMetric("milestone-lookup", "error", performance.now() - start, "INTERNAL_ERROR").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});

// ── Static fallback milestones for common ages ──────────────────
function getStaticMilestones(ageMonths: number): Record<string, { expected: string[]; redFlags: string[] }> {
  if (ageMonths < 6) {
    return {
      communication: { expected: ["Coos and babbles", "Turns head toward sounds"], redFlags: ["No response to sounds", "No vocalization"] },
      grossMotor: { expected: ["Lifts head during tummy time", "Rolls over"], redFlags: ["Floppy or stiff body", "Cannot hold head up"] },
      fineMotor: { expected: ["Grasps rattle", "Brings hands to mouth"], redFlags: ["No reaching for objects"] },
      personalSocial: { expected: ["Social smile", "Recognizes familiar faces"], redFlags: ["No social smile by 2 months"] },
    };
  }
  if (ageMonths < 12) {
    return {
      communication: { expected: ["Babbles with consonants (mama, dada)", "Responds to name"], redFlags: ["No babbling by 9 months", "Does not respond to name"] },
      grossMotor: { expected: ["Sits without support", "Pulls to stand"], redFlags: ["Not sitting by 9 months", "Very stiff or floppy"] },
      fineMotor: { expected: ["Transfers objects between hands", "Pincer grasp emerging"], redFlags: ["Cannot hold objects"] },
      personalSocial: { expected: ["Stranger anxiety", "Plays peek-a-boo"], redFlags: ["No back-and-forth interaction"] },
    };
  }
  if (ageMonths < 24) {
    return {
      communication: { expected: ["Says 1-3 words", "Points to show interest"], redFlags: ["No words by 16 months", "No pointing by 12 months"] },
      grossMotor: { expected: ["Walks independently", "Begins to run"], redFlags: ["Not walking by 18 months"] },
      fineMotor: { expected: ["Stacks 2-3 blocks", "Scribbles with crayon"], redFlags: ["Cannot pick up small objects"] },
      problemSolving: { expected: ["Finds hidden objects", "Uses objects as tools"], redFlags: ["No imitation of actions"] },
      personalSocial: { expected: ["Imitates others", "Plays alongside other children"], redFlags: ["No interest in other children", "Loss of skills"] },
    };
  }
  return {
    communication: { expected: ["Combines two words", "Follows two-step instructions"], redFlags: ["Fewer than 50 words", "No two-word phrases by 24 months"] },
    grossMotor: { expected: ["Runs well", "Kicks a ball"], redFlags: ["Frequent falls", "Cannot climb stairs"] },
    fineMotor: { expected: ["Stacks 6+ blocks", "Turns pages of a book"], redFlags: ["Cannot stack blocks"] },
    problemSolving: { expected: ["Sorts shapes and colors", "Pretend play"], redFlags: ["No pretend play by 30 months"] },
    personalSocial: { expected: ["Parallel play", "Shows empathy"], redFlags: ["No interest in peers", "Regression in social skills"] },
  };
}
