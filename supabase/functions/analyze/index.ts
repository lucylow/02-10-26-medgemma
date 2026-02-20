// supabase/functions/analyze/index.ts
/**
 * Production-grade analyze edge function.
 * - CORS, tracing (x-request-id), idempotency
 * - Rate-limit quota headers (X-RateLimit-*)
 * - Lovable AI (Gemini) clinical reasoning with deterministic fallback
 * - Embedding hash + consent tracking
 * - Rich telemetry to ai_events + edge_metrics
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const MODEL_ID = "google/gemini-3-flash-preview";
const AGENT_VERSION = "medgemma-service-v0.5";
const COST_PER_1K_TOKENS = 0.00015;

// Simple in-memory rate limiter (per edge instance; resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = rateLimitMap.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateLimitMap.set(key, entry);
  }
  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT - entry.count);
  return { allowed: entry.count <= RATE_LIMIT, remaining, resetAt: entry.resetAt };
}

function rateLimitHeaders(rl: { remaining: number; resetAt: number }): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": new Date(rl.resetAt).toISOString(),
  };
}

// ── Helpers ─────────────────────────────────────────────────────
async function recordMetric(handler: string, status: string, latencyMs: number, errorCode?: string) {
  try {
    await supabase.from("edge_metrics").insert({
      handler, status, latency_ms: Math.round(latencyMs), error_code: errorCode || null,
    });
  } catch (e) { console.error("metric insert failed:", e); }
}

async function recordAIEvent(event: Record<string, unknown>) {
  try { await supabase.from("ai_events").insert(event); } catch (e) { console.error("ai_event insert failed:", e); }
}

async function hashInput(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function errorResponse(code: string, message: string, status: number, traceId: string, extra: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({ error_code: code, message, trace_id: traceId }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json", ...extra } }
  );
}

// ── Deterministic baseline (mock-v1) ────────────────────────────
function baselineReport(ageMonths: number, domain: string, observations: string, hasImage: boolean, inputHash: string) {
  const obs = (observations || "").toLowerCase();
  const evidence: { type: string; content: string; influence: number }[] = [];
  const keyFindings: string[] = [];
  const recommendations: string[] = [];

  // Deterministic risk from input hash (mock-v1 spec)
  const seedByte = parseInt(inputHash.slice(0, 2), 16);
  let score: number;
  let risk: string;

  if (ageMonths < 6) {
    risk = "low"; score = 0.9;
  } else {
    const bucket = seedByte % 100;
    if (bucket < 50) { risk = "low"; score = 0.75 + (seedByte % 20) / 100; }
    else if (bucket < 85) { risk = "monitor"; score = 0.55 + (seedByte % 15) / 100; }
    else if (bucket < 95) { risk = "high"; score = 0.40 + (seedByte % 15) / 100; }
    else { risk = "refer"; score = 0.30 + (seedByte % 10) / 100; }
  }

  // Critical flag overrides
  if (obs.includes("no words") || obs.includes("not speaking") || obs.includes("doesn't respond")) {
    score = Math.max(score, 0.9);
    if (risk === "low") risk = "monitor";
    evidence.push({ type: "text", content: "Critical developmental flag detected", influence: 0.95 });
    keyFindings.push("Possible speech/hearing concern requiring evaluation.");
    recommendations.push("Immediate pediatric evaluation recommended.");
  }

  if (obs.includes("10 words") || obs.includes("only about 10 words")) {
    score = Math.min(score, 0.55);
    evidence.push({ type: "text", content: "Reported vocabulary ~10 words", influence: 0.85 });
    keyFindings.push("Expressive vocabulary smaller than expected for age.");
    recommendations.push("Complete ASQ-3 screening for language.");
  }

  if (keyFindings.length === 0) {
    evidence.push({ type: "text", content: "Observations within expected ranges", influence: 0.3 });
    keyFindings.push("No immediate red flags identified.");
    recommendations.push("Continue routine monitoring.");
  }

  if (hasImage) evidence.push({ type: "image", content: "Image provided for visual context", influence: 0.2 });

  const summaryMap: Record<string, string> = {
    low: "Observations appear within typical developmental limits.",
    monitor: "Some developmental markers to monitor; consider formal screening.",
    high: "Significant concerns — prompt clinical evaluation recommended.",
    refer: "Urgent referral recommended for comprehensive evaluation.",
  };

  return {
    riskLevel: risk,
    confidence: Math.round(score * 100) / 100,
    summary: summaryMap[risk] || summaryMap.low,
    keyFindings,
    recommendations,
    evidence,
    analysis_meta: { age_months: ageMonths, domain, observations_snippet: (observations || "").slice(0, 500), image_provided: hasImage },
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

  const userPrompt = `Child age: ${ageMonths} months\nDevelopmental domain: ${domain || "general"}\nParent/caregiver observations: ${observations}`;

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000); // 5s deadline
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.2,
        max_tokens: 512,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Lovable AI error:", resp.status, errText);
      return { ok: false, status: resp.status, error: errText };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    const usage = data.usage;
    if (!content) return null;

    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first === -1 || last === -1) return { ok: false, raw: content, usage };

    const parsed = JSON.parse(content.slice(first, last + 1));
    if (parsed.riskLevel && ["low", "medium", "high"].includes(parsed.riskLevel) && Array.isArray(parsed.keyFindings)) {
      return { ok: true, result: parsed, usage };
    }
    return { ok: false, raw: content, usage };
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === "AbortError";
    console.error("Lovable AI call failed:", e);
    return { ok: false, error: isTimeout ? "MODEL_TIMEOUT" : String(e) };
  }
}

// ── Main handler ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = performance.now();
  let errorCode: string | undefined;
  const traceId = req.headers.get("x-request-id") || crypto.randomUUID();

  // Rate limit by API key or IP
  const rlKey = req.headers.get("apikey") || req.headers.get("x-forwarded-for") || "global";
  const rl = checkRateLimit(rlKey);
  const rlHeaders = rateLimitHeaders(rl);

  if (!rl.allowed) {
    await recordMetric("analyze", "rate_limited", performance.now() - start, "RATE_LIMITED");
    return new Response(
      JSON.stringify({ error_code: "RATE_LIMITED", message: "Too many requests. Retry after rate limit resets.", trace_id: traceId }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rlHeaders, "Retry-After": "60" } }
    );
  }

  try {
    if (req.method !== "POST") {
      errorCode = "METHOD_NOT_ALLOWED";
      return errorResponse(errorCode, "Only POST is supported", 405, traceId, rlHeaders);
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
          JSON.stringify({ success: true, screening_id: existing.screening_id, report: existing.report, timestamp: existing.created_at, idempotent: true, trace_id: traceId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...rlHeaders } }
        );
      }
    }

    // ── Parse input ───────────────────────────────────────────
    const contentType = req.headers.get("content-type") || "";
    let childAge: number;
    let domain: string;
    let observations: string;
    let imagePath: string | null = null;
    let embeddingB64: string | null = null;
    let consentId: string | null = null;
    let inputTypes: string[] = ["text"];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      childAge = parseInt(form.get("childAge")?.toString() ?? "", 10);
      domain = form.get("domain")?.toString() ?? "";
      observations = form.get("observations")?.toString() ?? "";
      consentId = form.get("consent_id")?.toString() || null;

      const file = form.get("image") as File | null;
      if (file && file.size > 0) {
        inputTypes.push("image");
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
      embeddingB64 = body.embedding_b64 || null;
      consentId = body.consent_id || null;
      if (embeddingB64) inputTypes.push("embedding");
    } else {
      return errorResponse("UNSUPPORTED_CONTENT_TYPE", "Use application/json or multipart/form-data", 400, traceId, rlHeaders);
    }

    if (isNaN(childAge) || childAge < 0 || childAge > 216) {
      return errorResponse("INVALID_CHILD_AGE", "childAge must be 0-216 months", 400, traceId, rlHeaders);
    }

    // ── Analysis: baseline + AI ───────────────────────────────
    const inputHash = await hashInput(`${childAge}|${domain}|${observations}`);
    const embeddingHash = embeddingB64 ? (await hashInput(embeddingB64)).slice(0, 16) : null;
    const baseline = baselineReport(childAge, domain, observations, !!imagePath, inputHash);
    const promptTokens = Math.ceil((observations || "").split(/\s+/).length * 1.3);

    const aiStart = performance.now();
    const aiResponse = await callLovableAI(childAge, domain, observations);
    const aiLatency = Math.round(performance.now() - aiStart);

    let finalReport = baseline;
    let usedModel = false;
    let isFallback = false;
    let fallbackReason: string | null = null;

    if (aiResponse && typeof aiResponse === "object" && "ok" in aiResponse) {
      if (aiResponse.ok && aiResponse.result) {
        usedModel = true;
        const r = aiResponse.result;
        finalReport = {
          ...baseline,
          riskLevel: r.riskLevel,
          confidence: Math.min(1, Math.max(0, r.confidence)),
          summary: r.summary || baseline.summary,
          keyFindings: [...new Set([...baseline.keyFindings, ...(r.keyFindings || [])])],
          recommendations: [...new Set([...baseline.recommendations, ...(r.recommendations || [])])],
          evidence: [
            ...baseline.evidence,
            ...(r.evidence || []).map((e: { type?: string; content?: string; influence?: number }) => ({
              type: e.type || "model_text", content: e.content || "", influence: Math.min(1, Math.max(0, e.influence ?? 0.5)),
            })),
          ],
        };
      } else {
        isFallback = true;
        fallbackReason = aiResponse.error ? String(aiResponse.error) : "parse_failure";
      }
    } else if (!LOVABLE_API_KEY) {
      isFallback = true;
      fallbackReason = "no_api_key_configured";
    } else {
      isFallback = true;
      fallbackReason = "null_response";
    }

    // ── Persist screening ─────────────────────────────────────
    const screeningId = idempotencyKey || `ps-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const { error: dbErr } = await supabase.from("screenings").insert([{
      screening_id: screeningId,
      child_age_months: childAge,
      domain,
      observations,
      image_path: imagePath,
      report: { ...finalReport, model_used: usedModel, fallback_to: isFallback ? "mock-v1" : null },
      status: "created",
      risk_level: finalReport.riskLevel,
      model_id: usedModel ? MODEL_ID : null,
      adapter_id: "medgemma_pediscreen_v1",
      confidence: finalReport.confidence,
      input_hash: inputHash.slice(0, 16),
      embedding_hash: embeddingHash,
      is_mock: isFallback,
      prompt_hash: inputHash,
    }]);

    if (dbErr) {
      console.error("db insert error:", dbErr);
      errorCode = "DB_INSERT_FAILED";
      await recordMetric("analyze", "error", performance.now() - start, errorCode);
      return errorResponse(errorCode, dbErr.message, 500, traceId, rlHeaders);
    }

    const totalLatency = Math.round(performance.now() - start);
    const totalTokens = promptTokens + (aiResponse?.usage?.total_tokens || 256);
    const costEstimate = (totalTokens / 1000) * COST_PER_1K_TOKENS;

    // ── Record telemetry ──────────────────────────────────────
    await Promise.all([
      recordMetric("analyze", "success", totalLatency),
      recordAIEvent({
        event_type: "inference",
        screening_id: screeningId,
        model_provider: usedModel ? "google" : null,
        model_id: usedModel ? MODEL_ID : null,
        adapter_id: "medgemma_pediscreen_v1",
        model_version: AGENT_VERSION,
        input_types: inputTypes,
        input_hash: inputHash.slice(0, 16),
        prompt_tokens: promptTokens,
        risk_level: finalReport.riskLevel,
        confidence: finalReport.confidence,
        fallback: isFallback,
        fallback_reason: isFallback ? (fallbackReason || "unknown") : null,
        latency_ms: totalLatency,
        status_code: 200,
        cost_estimate_usd: usedModel ? costEstimate : 0,
        agent: AGENT_VERSION,
        trace_id: traceId,
        idempotency_key: idempotencyKey,
        metadata: {
          ai_latency_ms: aiLatency,
          used_model: usedModel,
          domain,
          age_months: childAge,
          image_provided: !!imagePath,
          embedding_provided: !!embeddingB64,
          consent_id: consentId,
          fallback_to: isFallback ? "mock-v1" : null,
        },
      }),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        screening_id: screeningId,
        report: finalReport,
        timestamp: Date.now(),
        model_id: usedModel ? MODEL_ID : null,
        adapter_id: "medgemma_pediscreen_v1",
        model_used: usedModel,
        fallback: isFallback,
        fallback_to: isFallback ? "mock-v1" : null,
        confidence: finalReport.confidence,
        trace_id: traceId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...rlHeaders } }
    );
  } catch (err) {
    console.error("analyze error:", err);
    errorCode = "INTERNAL_ERROR";
    const totalLatency = performance.now() - start;
    await Promise.all([
      recordMetric("analyze", "error", totalLatency, errorCode),
      recordAIEvent({
        event_type: "inference", fallback: true, fallback_reason: "internal_error",
        latency_ms: Math.round(totalLatency), status_code: 500, error_code: errorCode,
        agent: AGENT_VERSION, trace_id: traceId,
      }),
    ]);
    return errorResponse(errorCode, String(err), 500, traceId, rlHeaders);
  }
});
