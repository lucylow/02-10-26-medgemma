/**
 * POST /developmental-chat — Streaming AI developmental guidance chat v5.1.
 * Uses Lovable AI (Gemini 3 Flash) for real-time conversational pediatric
 * developmental guidance for CHWs and parents. Streams SSE tokens.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, corsResponse, errorResponse,
  extractContext, recordMetric,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  LOVABLE_API_KEY, MODEL_ID, AI_GATEWAY_URL,
} from "../_shared/mod.ts";

const SYSTEM_PROMPT = `You are PediScreen AI Assistant v5.1 — a warm, knowledgeable pediatric developmental guidance specialist.

ROLE:
- You help Community Health Workers (CHWs), parents, and caregivers understand child development
- You answer questions about developmental milestones, screening results, and next steps
- You provide evidence-based guidance using CDC, AAP, and WHO frameworks

COMMUNICATION STYLE:
- Use clear, empathetic language at a grade 6 reading level for parents
- For CHWs, provide clinical context when asked
- Always validate parental concerns — "You know your child best"
- Never diagnose — guide toward appropriate screening and professional evaluation
- Be specific and actionable in recommendations

GUIDELINES:
- Reference age-appropriate milestones (CDC "Learn the Signs. Act Early." 2022)
- Suggest concrete activities parents can do at home
- Flag red flags that need urgent attention (regression, seizures, no eye contact)
- Recommend formal screening tools (ASQ-3, M-CHAT-R/F) when appropriate
- Mention Early Intervention services when warranted
- Respect cultural and linguistic diversity

SAFETY:
- Never replace professional medical advice
- Always recommend consulting a pediatrician for concerns
- Flag emergencies clearly (regression in skills, seizure activity)
- Do not provide medication advice`;

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const traceId = ctx.traceId;

  const rl = checkRateLimit(rateLimitKey(req), 20);
  const rlH = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return errorResponse("RATE_LIMITED", "Too many requests. Please wait a moment.", 429, traceId, rlH);
  }

  try {
    if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, traceId, rlH);

    const { messages, childAgeMonths, role } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("INVALID_INPUT", "messages array required", 400, traceId, rlH);
    }

    if (!LOVABLE_API_KEY) {
      return errorResponse("CONFIG_ERROR", "AI service not configured", 503, traceId, rlH);
    }

    // Build contextual system prompt
    let systemContent = SYSTEM_PROMPT;
    if (childAgeMonths) {
      systemContent += `\n\nCONTEXT: The child being discussed is ${childAgeMonths} months old.`;
    }
    if (role === "chw") {
      systemContent += `\n\nThe user is a Community Health Worker — you can use clinical terminology and reference screening tools directly.`;
    } else {
      systemContent += `\n\nThe user is a parent/caregiver — use simple, reassuring language.`;
    }

    const aiMessages = [
      { role: "system", content: systemContent },
      ...messages.slice(-20), // Keep last 20 messages for context window
    ];

    // Stream from AI gateway
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: aiMessages,
        stream: true,
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[developmental-chat] AI error:", response.status, errText);

      if (response.status === 429) {
        return errorResponse("RATE_LIMITED", "AI rate limit exceeded. Please try again shortly.", 429, traceId, rlH);
      }
      if (response.status === 402) {
        return errorResponse("PAYMENT_REQUIRED", "AI credits exhausted. Please add credits.", 402, traceId, rlH);
      }
      return errorResponse("AI_ERROR", "AI service error", 500, traceId, rlH);
    }

    const totalLatency = Math.round(performance.now() - start);
    recordMetric("developmental-chat", "success", totalLatency, undefined, {
      message_count: messages.length, role: role || "parent", child_age: childAgeMonths,
    }).catch(() => {});

    // Pass through the SSE stream
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Trace-Id": traceId,
      },
    });
  } catch (err) {
    console.error("[developmental-chat] error:", err);
    recordMetric("developmental-chat", "error", performance.now() - start, "INTERNAL_ERROR").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
