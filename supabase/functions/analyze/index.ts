// supabase/functions/analyze/index.ts
/**
 * Production-grade analyze edge function.
 * - CORS support
 * - Lovable AI (Gemini) integration for clinical reasoning
 * - Deterministic baseline fallback
 * - Idempotency via idempotency_key
 * - Metrics logging to edge_metrics table
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Metrics helper ──────────────────────────────────────────────
async function recordMetric(handler: string, status: string, latencyMs: number, errorCode?: string) {
  try {
    await supabase.from("edge_metrics").insert({
      handler,
      status,
      latency_ms: Math.round(latencyMs),
      error_code: errorCode || null,
    });
  } catch (e) {
    console.error("metric insert failed:", e);
  }
}

// ── Deterministic baseline ──────────────────────────────────────
function baselineReport(ageMonths: number, domain: string, observations: string, hasImage: boolean) {
  const obs = (observations || "").toLowerCase();
  const evidence: { type: string; content: string; influence: number }[] = [];
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  let score = 0.85;

  if (obs.includes("10 words") || obs.includes("only about 10 words")) {
    score = 0.45;
    evidence.push({ type: "text", content: "Reported vocabulary ~10 words", influence: 0.85 });
    keyFindings.push("Expressive vocabulary smaller than expected for age.");
    recommendations.push("Complete ASQ-3 screening for language.");
    recommendations.push("Increase shared reading and naming during routines.");
  } else if (obs.includes("not responding") || obs.includes("doesn't respond")) {
    score = 0.2;
    evidence.push({ type: "text", content: "Possible reduced responsiveness", influence: 0.95 });
    keyFindings.push("Possible hearing/attention concern.");
    recommendations.push("Immediate hearing check with pediatrician.");
  } else {
    score = 0.92;
    evidence.push({ type: "text", content: "Observations within expected ranges", influence: 0.3 });
    keyFindings.push("No immediate red flags.");
    recommendations.push("Continue routine monitoring.");
  }

  if (hasImage) {
    evidence.push({ type: "image", content: "Image provided for visual context", influence: 0.2 });
  }

  const risk = score < 0.3 ? "high" : score < 0.7 ? "medium" : "low";
  const summaryMap: Record<string, string> = {
    high: "Significant concerns — prompt evaluation recommended.",
    medium: "Some markers to monitor; consider formal screening.",
    low: "Observations appear within typical limits.",
  };

  return {
    riskLevel: risk,
    confidence: Math.round(score * 100) / 100,
    summary: summaryMap[risk],
    keyFindings,
    recommendations,
    evidence,
    analysis_meta: {
      age_months: ageMonths,
      domain,
      observations_snippet: (observations || "").slice(0, 500),
      image_provided: hasImage,
    },
  };
}

// ── Lovable AI clinical reasoning ───────────────────────────────
async function callLovableAI(ageMonths: number, domain: string, observations: string) {
  if (!LOVABLE_API_KEY) return null;

  const systemPrompt = `You are a pediatric developmental screening clinical assistant powered by MedGemma.
Analyze the child's developmental observations and return a JSON object with this exact schema:
{
  "riskLevel": "low" | "medium" | "high",
  "confidence": 0.0-1.0,
  "summary": "one-sentence clinical summary",
  "keyFindings": ["finding 1", "finding 2"],
  "recommendations": ["action 1", "action 2"],
  "evidence": [{"type":"text","content":"...","influence":0.0-1.0}]
}
Return ONLY valid JSON. Be evidence-based, concise, and clinically appropriate.`;

  const userPrompt = `Child age: ${ageMonths} months
Developmental domain: ${domain || "general"}
Parent/caregiver observations: ${observations}`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Lovable AI error:", resp.status, errText);
      return null;
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Extract JSON from response
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first === -1 || last === -1) return null;

    const parsed = JSON.parse(content.slice(first, last + 1));
    if (
      parsed.riskLevel &&
      ["low", "medium", "high"].includes(parsed.riskLevel) &&
      Array.isArray(parsed.keyFindings)
    ) {
      return parsed;
    }
    return null;
  } catch (e) {
    console.error("Lovable AI call failed:", e);
    return null;
  }
}

// ── Main handler ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = performance.now();
  let errorCode: string | undefined;

  try {
    if (req.method !== "POST") {
      errorCode = "method_not_allowed";
      return new Response(JSON.stringify({ error: errorCode }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Idempotency check ─────────────────────────────────────
    const idempotencyKey = req.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("screenings")
        .select("*")
        .eq("screening_id", idempotencyKey)
        .maybeSingle();

      if (existing) {
        await recordMetric("analyze", "idempotent_hit", performance.now() - start);
        return new Response(
          JSON.stringify({
            success: true,
            screening_id: existing.screening_id,
            report: existing.report,
            timestamp: existing.created_at,
            idempotent: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Parse input ───────────────────────────────────────────
    const contentType = req.headers.get("content-type") || "";
    let childAge: number;
    let domain: string;
    let observations: string;
    let imagePath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      childAge = parseInt(form.get("childAge")?.toString() ?? "", 10);
      domain = form.get("domain")?.toString() ?? "";
      observations = form.get("observations")?.toString() ?? "";

      const file = form.get("image") as File | null;
      if (file && file.size > 0) {
        const screeningPrefix = idempotencyKey || `ps-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const storagePath = `${screeningPrefix}/${file.name ?? "upload.jpg"}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { error: upErr } = await supabase.storage
          .from("uploads")
          .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
        if (upErr) console.error("storage upload error:", upErr);
        else imagePath = storagePath;
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      childAge = body.childAge ?? body.age_months;
      domain = body.domain ?? "";
      observations = body.observations ?? "";
    } else {
      errorCode = "unsupported_content_type";
      return new Response(JSON.stringify({ error: errorCode }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isNaN(childAge)) {
      errorCode = "invalid_child_age";
      return new Response(JSON.stringify({ error: "childAge must be integer months" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Analysis: baseline + AI ───────────────────────────────
    const baseline = baselineReport(childAge, domain, observations, !!imagePath);

    // Try Lovable AI for enhanced clinical reasoning
    const aiResult = await callLovableAI(childAge, domain, observations);

    let finalReport = baseline;
    let usedModel = false;
    let parseOk = true;

    if (aiResult) {
      usedModel = true;
      // Merge: AI enriches baseline, baseline findings preserved
      finalReport = {
        ...baseline,
        riskLevel: aiResult.riskLevel,
        confidence: Math.min(1, Math.max(0, aiResult.confidence)),
        summary: aiResult.summary || baseline.summary,
        keyFindings: [...new Set([...baseline.keyFindings, ...(aiResult.keyFindings || [])])],
        recommendations: [...new Set([...baseline.recommendations, ...(aiResult.recommendations || [])])],
        evidence: [
          ...baseline.evidence,
          ...(aiResult.evidence || []).map((e: { type?: string; content?: string; influence?: number }) => ({
            type: e.type || "model_text",
            content: e.content || "",
            influence: Math.min(1, Math.max(0, e.influence ?? 0.5)),
          })),
        ],
      };
    }

    // ── Persist ───────────────────────────────────────────────
    const screeningId = idempotencyKey || `ps-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const insertRow = {
      screening_id: screeningId,
      child_age_months: childAge,
      domain,
      observations,
      image_path: imagePath,
      report: { ...finalReport, model_used: usedModel, model_parse_ok: parseOk },
    };

    const { error: dbErr } = await supabase.from("screenings").insert([insertRow]);
    if (dbErr) {
      console.error("db insert error:", dbErr);
      errorCode = "db_insert_failed";
      return new Response(JSON.stringify({ error: errorCode, detail: dbErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await recordMetric("analyze", "success", performance.now() - start);

    return new Response(
      JSON.stringify({
        success: true,
        screening_id: screeningId,
        report: finalReport,
        timestamp: Date.now(),
        model_used: usedModel,
        model_parse_ok: parseOk,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze error:", err);
    errorCode = "internal_error";
    await recordMetric("analyze", "error", performance.now() - start, errorCode);
    return new Response(
      JSON.stringify({ error: errorCode, detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
