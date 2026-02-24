/**
 * POST /rop-analyze — ROP (Retinopathy of Prematurity) detection via Lovable AI.
 * Uses Gemini 2.5 Flash vision model for retinal fundus image analysis.
 * Falls back to clinical mock data for demo when AI gateway is unreachable.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, supabase, errorResponse, jsonResponse,
  corsHeaders, LOVABLE_API_KEY,
  recordAIEvent, callAIGateway,
} from "../_shared/mod.ts";

const ROP_MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You are PediScreen ROP Analyzer, a clinical-grade AI assistant for Retinopathy of Prematurity screening.

Given a retinal fundus image of a preterm infant, provide a structured JSON analysis:

{
  "zone": "1" | "2" | "3",
  "stage": "normal" | "1" | "2" | "3" | "4" | "5",
  "plus_disease": boolean,
  "aggressive_posterior": boolean,
  "confidence": 0.0-1.0,
  "risk_level": "normal" | "pre-threshold" | "threshold" | "urgent",
  "findings": ["list of clinical findings"],
  "recommendation": "clinical recommendation text",
  "urgency_hours": null | number,
  "icd10": "relevant ICD-10 code"
}

Guidelines:
- Zone 1 Stage 3+ with plus disease = Type 1 ROP → treat within 48-72h
- Zone 2 Stage 3 with plus disease = Type 1 ROP → treat within 48-72h
- Always note vessel tortuosity and dilation for plus disease assessment
- Use ICROP-3 classification (2021)
- Be conservative: when uncertain, recommend specialist review
- icd10: H35.1 for ROP, add specificity codes as applicable
- Return ONLY the JSON object, no markdown fences or extra text.`;

function mockROPResult() {
  return {
    zone: "1",
    stage: "3",
    plus_disease: true,
    aggressive_posterior: false,
    confidence: 0.94,
    risk_level: "urgent",
    findings: [
      "Neovascularization ridge visible in Zone 1",
      "Vessel tortuosity consistent with plus disease",
      "Extraretinal fibrovascular proliferation noted",
    ],
    recommendation:
      "Type 1 ROP — urgent laser photocoagulation or anti-VEGF therapy recommended within 48-72 hours. Refer to pediatric retinal specialist immediately.",
    urgency_hours: 48,
    icd10: "H35.10",
    is_mock: true,
    model: "fallback-mock",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const traceId = crypto.randomUUID();

  try {
    const body = await req.json();
    const { image_b64, gestational_age_weeks, birth_weight_grams, postnatal_age_weeks, case_id } = body;

    // Build user prompt with clinical context
    let userPrompt = "Analyze this retinal fundus image for Retinopathy of Prematurity (ROP).";
    if (gestational_age_weeks) userPrompt += ` Gestational age: ${gestational_age_weeks} weeks.`;
    if (birth_weight_grams) userPrompt += ` Birth weight: ${birth_weight_grams}g.`;
    if (postnatal_age_weeks) userPrompt += ` Postnatal age: ${postnatal_age_weeks} weeks.`;
    userPrompt += " Return structured JSON only.";

    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (image_b64) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${image_b64}` },
          },
          { type: "text", text: userPrompt },
        ],
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    // Call Lovable AI gateway
    let analysis: Record<string, unknown>;
    let usedMock = false;

    try {
      const aiData = await callAIGateway(messages, {
        model: ROP_MODEL,
        temperature: 0.1,
        max_tokens: 1024,
      });

      const rawContent = aiData.choices?.[0]?.message?.content ?? "";
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : mockROPResult();
      usedMock = !jsonMatch;
    } catch (err) {
      console.error("AI gateway failed, using mock:", err);
      analysis = mockROPResult();
      usedMock = true;
    }

    // Log to ai_events
    await recordAIEvent({
      event_type: "rop_analysis",
      case_id: case_id ?? null,
      model_id: usedMock ? "fallback-mock" : ROP_MODEL,
      model_provider: "google",
      confidence: typeof analysis.confidence === "number" ? analysis.confidence : null,
      risk_level: typeof analysis.risk_level === "string" ? analysis.risk_level as string : null,
      is_mock: usedMock,
      trace_id: traceId,
      metadata: {
        zone: analysis.zone,
        stage: analysis.stage,
        plus_disease: analysis.plus_disease,
        gestational_age_weeks,
        birth_weight_grams,
      },
    });

    return jsonResponse({
      ...analysis,
      is_mock: usedMock,
      model: usedMock ? "fallback-mock" : ROP_MODEL,
      trace_id: traceId,
    });
  } catch (err) {
    console.error("ROP analyze error:", err);
    return errorResponse("ROP_ERROR", String(err), 500, traceId);
  }
});
