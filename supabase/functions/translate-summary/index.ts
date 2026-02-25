/**
 * POST /translate-summary — AI-powered translation of screening summaries.
 * Translates parent-friendly text into target language while preserving
 * medical accuracy and cultural sensitivity.
 */
import {
  corsResponse, errorResponse, jsonResponse,
  extractContext, recordMetric, callAIGateway, handleAIErrorResponse,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  AGENT_VERSION,
} from "../_shared/mod.ts";

const TRANSLATE_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_translation",
    description: "Submit translated screening content",
    parameters: {
      type: "object",
      properties: {
        translatedSummary: { type: "string", description: "Translated parent-friendly summary" },
        translatedTips: { type: "array", items: { type: "string" }, description: "Translated parent tips" },
        translatedRecommendations: { type: "array", items: { type: "string" }, description: "Translated recommendations" },
        culturalNotes: { type: "string", description: "Any culturally relevant adaptations made" },
        targetLanguage: { type: "string" },
        readingLevel: { type: "string", description: "Approximate reading level of translation" },
      },
      required: ["translatedSummary", "targetLanguage"],
      additionalProperties: false,
    },
  },
};

const SUPPORTED_LANGUAGES: Record<string, string> = {
  es: "Spanish", fr: "French", zh: "Mandarin Chinese", ar: "Arabic",
  vi: "Vietnamese", ko: "Korean", pt: "Portuguese", ht: "Haitian Creole",
  tl: "Tagalog", ru: "Russian", ja: "Japanese", hi: "Hindi",
  bn: "Bengali", de: "German", so: "Somali", sw: "Swahili",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const traceId = ctx.traceId;
  const rl = checkRateLimit(rateLimitKey(req), 30);
  const rlH = rateLimitHeaders(rl);
  if (!rl.allowed) return errorResponse("RATE_LIMITED", "Too many requests", 429, traceId, rlH);

  try {
    if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, traceId, rlH);

    const { text, tips, recommendations, targetLang } = await req.json();

    if (!text || !targetLang) {
      return errorResponse("INVALID_INPUT", "text and targetLang required", 400, traceId, rlH);
    }

    const langName = SUPPORTED_LANGUAGES[targetLang] || targetLang;

    if (req.method === "GET") {
      return jsonResponse({ supported_languages: SUPPORTED_LANGUAGES }, 200, rlH);
    }

    const contentToTranslate = [
      `Parent Summary: ${text}`,
      tips?.length ? `Tips: ${tips.join(" | ")}` : "",
      recommendations?.length ? `Recommendations: ${recommendations.join(" | ")}` : "",
    ].filter(Boolean).join("\n\n");

    const aiResult = await callAIGateway(
      [
        {
          role: "system",
          content: `You are a certified medical translator specializing in pediatric developmental health.
Translate the following content into ${langName}.

RULES:
- Maintain medical accuracy while using simple, parent-friendly language
- Adapt cultural references when appropriate (note adaptations in culturalNotes)
- Keep at grade 5-6 reading level in the target language
- Preserve the reassuring, supportive tone
- Do NOT translate medical terms that are universally understood (e.g., ICD codes)
- For recommendations, preserve clinical specificity

Use the submit_translation tool.`,
        },
        { role: "user", content: contentToTranslate },
      ],
      {
        tools: [TRANSLATE_TOOL],
        tool_choice: { type: "function", function: { name: "submit_translation" } },
        temperature: 0.1,
        deadlineMs: 12000,
      },
    );

    const aiError = handleAIErrorResponse(aiResult, traceId, rlH);
    if (aiError) return aiError;

    if (aiResult.ok && aiResult.result && !("raw_content" in aiResult.result)) {
      await recordMetric("translate-summary", "ok", Math.round(performance.now() - start));
      return jsonResponse({
        ...aiResult.result,
        model_used: true,
        trace_id: traceId,
        version: AGENT_VERSION,
      }, 200, rlH);
    }

    return errorResponse("TRANSLATION_FAILED", "Could not translate content", 500, traceId, rlH);
  } catch (err) {
    console.error("[translate-summary] error:", err);
    await recordMetric("translate-summary", "error", Math.round(performance.now() - start), String(err));
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
