// supabase/functions/analyze/index.ts
/**
 * POST /analyze — Clinical screening analysis v4.0.
 * Lovable AI (Gemini) with deterministic mock-v1 fallback.
 * Features: rate-limiting, idempotency, tracing, consent,
 * embedding hash, org scoping, PHI audit, deadline enforcement.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, corsResponse, supabase, errorResponse, jsonResponse,
  extractTraceId, extractContext, recordMetric, recordAIEvent, recordAuditEvent,
  hashInput, withDeadline,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
  LOVABLE_API_KEY, MODEL_ID, AGENT_VERSION, COST_PER_1K_TOKENS,
} from "../_shared/mod.ts";
import { deterministicMock } from "../_shared/mock.ts";

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
Return ONLY valid JSON. Be evidence-based, concise, and clinically appropriate.
Consider age-appropriate milestones and AAP developmental surveillance guidelines.`;

  const userPrompt = `Child age: ${ageMonths} months\nDevelopmental domain: ${domain || "general"}\nParent/caregiver observations: ${observations}`;

  try {
    const resp = await withDeadline(
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.2,
          max_tokens: 512,
        }),
      }),
      5000, // 5s deadline
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[analyze] AI error:", resp.status, errText);
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
    const isTimeout = e instanceof Error && e.message === "DEADLINE_EXCEEDED";
    console.error("[analyze] AI call failed:", e);
    return { ok: false, error: isTimeout ? "MODEL_TIMEOUT" : String(e) };
  }
}

// ── Main handler ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  let errorCode: string | undefined;
  const ctx = extractContext(req);
  const traceId = ctx.traceId;

  // Rate limit: 30/min for analyze (expensive)
  const rl = checkRateLimit(rateLimitKey(req), 30);
  const rlH = rateLimitHeaders(rl);

  if (!rl.allowed) {
    await recordMetric("analyze", "rate_limited", performance.now() - start, "RATE_LIMITED");
    return errorResponse("RATE_LIMITED", "Too many requests. Retry after rate limit resets.", 429, traceId, { ...rlH, "Retry-After": "60" });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only POST is supported", 405, traceId, rlH);
    }

    // Idempotency check
    const idempotencyKey = req.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("screenings").select("*").eq("screening_id", idempotencyKey).maybeSingle();
      if (existing) {
        await recordMetric("analyze", "idempotent_hit", performance.now() - start);
        return jsonResponse({
          success: true, screening_id: existing.screening_id, report: existing.report,
          timestamp: existing.created_at, idempotent: true, trace_id: traceId,
        }, 200, rlH);
      }
    }

    // Parse input
    const contentType = req.headers.get("content-type") || "";
    let childAge: number;
    let domain: string;
    let observations: string;
    let imagePath: string | null = null;
    let embeddingB64: string | null = null;
    let consentId: string | null = null;
    let caseId: string | null = null;
    const inputTypes: string[] = ["text"];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      childAge = parseInt(form.get("childAge")?.toString() ?? "", 10);
      domain = form.get("domain")?.toString() ?? "";
      observations = form.get("observations")?.toString() ?? "";
      consentId = form.get("consent_id")?.toString() || null;
      caseId = form.get("case_id")?.toString() || null;

      const file = form.get("image") as File | null;
      if (file && file.size > 0) {
        if (!consentId) {
          return errorResponse("CONSENT_REQUIRED", "consent_id is required for image uploads (PHI minimization)", 400, traceId, rlH);
        }
        inputTypes.push("image");
        const screeningPrefix = idempotencyKey || `ps-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const storagePath = `${screeningPrefix}/${file.name ?? "upload.jpg"}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { error: upErr } = await supabase.storage
          .from("uploads")
          .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
        if (upErr) console.error("[analyze] storage upload error:", upErr);
        else imagePath = storagePath;
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      childAge = body.childAge ?? body.age_months;
      domain = body.domain ?? "";
      observations = body.observations ?? "";
      embeddingB64 = body.embedding_b64 || null;
      consentId = body.consent_id || null;
      caseId = body.case_id || null;
      if (embeddingB64) inputTypes.push("embedding");
      if (body.image_meta?.hash) inputTypes.push("image_ref");
    } else {
      return errorResponse("UNSUPPORTED_CONTENT_TYPE", "Use application/json or multipart/form-data", 400, traceId, rlH);
    }

    if (isNaN(childAge) || childAge < 0 || childAge > 216) {
      return errorResponse("INVALID_CHILD_AGE", "childAge must be 0-216 months", 400, traceId, rlH);
    }
    if (!observations || observations.trim().length < 3) {
      return errorResponse("INVALID_OBSERVATIONS", "observations must be at least 3 characters", 400, traceId, rlH);
    }

    // Compute hashes
    const inputHash = await hashInput(`${childAge}|${domain}|${observations}`);
    const embeddingHash = embeddingB64 ? (await hashInput(embeddingB64)).slice(0, 16) : null;
    const promptHash = await hashInput(`system_v4|${childAge}|${domain}|${observations.slice(0, 200)}`);

    // Build deterministic baseline
    const baseline = deterministicMock(childAge, domain, observations, !!imagePath, inputHash);
    const promptTokens = Math.ceil((observations || "").split(/\s+/).length * 1.3);

    // Call AI with deadline
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

    // Persist screening
    const screeningId = idempotencyKey || `ps-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const { error: dbErr } = await supabase.from("screenings").insert([{
      screening_id: screeningId,
      child_age_months: childAge,
      domain,
      observations,
      image_path: imagePath,
      report: {
        ...finalReport,
        model_used: usedModel,
        fallback_to: isFallback ? "mock-v1.1" : null,
        consent_id: consentId,
        case_id: caseId,
      },
      status: "created",
      risk_level: finalReport.riskLevel,
      model_id: usedModel ? MODEL_ID : null,
      adapter_id: "medgemma_pediscreen_v1",
      confidence: finalReport.confidence,
      input_hash: inputHash.slice(0, 16),
      embedding_hash: embeddingHash,
      prompt_hash: promptHash.slice(0, 16),
      is_mock: isFallback,
    }]);

    if (dbErr) {
      console.error("[analyze] db insert error:", dbErr);
      errorCode = "DB_INSERT_FAILED";
      await recordMetric("analyze", "error", performance.now() - start, errorCode);
      return errorResponse(errorCode, dbErr.message, 500, traceId, rlH);
    }

    const totalLatency = Math.round(performance.now() - start);
    const totalTokens = promptTokens + (aiResponse?.usage?.total_tokens || 256);
    const costEstimate = (totalTokens / 1000) * COST_PER_1K_TOKENS;

    // Fire-and-forget telemetry
    Promise.all([
      recordMetric("analyze", "success", totalLatency, undefined, {
        model_used: usedModel, fallback: isFallback, consent_id: consentId,
        risk_level: finalReport.riskLevel, org_id: ctx.orgId,
      }),
      recordAIEvent({
        event_type: "inference", screening_id: screeningId,
        model_provider: usedModel ? "google" : null, model_id: usedModel ? MODEL_ID : null,
        adapter_id: "medgemma_pediscreen_v1", model_version: AGENT_VERSION,
        input_types: inputTypes, input_hash: inputHash.slice(0, 16),
        prompt_tokens: promptTokens, risk_level: finalReport.riskLevel,
        confidence: finalReport.confidence, fallback: isFallback,
        fallback_reason: isFallback ? (fallbackReason || "unknown") : null,
        latency_ms: totalLatency, status_code: 200,
        cost_estimate_usd: usedModel ? costEstimate : 0,
        agent: AGENT_VERSION, trace_id: traceId, idempotency_key: idempotencyKey,
        org_id: ctx.orgId, case_id: caseId,
        metadata: {
          ai_latency_ms: aiLatency, used_model: usedModel, domain,
          age_months: childAge, image_provided: !!imagePath,
          embedding_provided: !!embeddingB64, consent_id: consentId,
          fallback_to: isFallback ? "mock-v1.1" : null,
          prompt_hash: promptHash.slice(0, 16),
        },
      }),
      recordAuditEvent("screening_created", {
        screening_id: screeningId, risk_level: finalReport.riskLevel,
        model_used: usedModel, fallback: isFallback, org_id: ctx.orgId,
        input_hash: inputHash.slice(0, 16), trace_id: traceId,
      }, screeningId),
    ]).catch((e) => console.error("[analyze] telemetry error:", e));

    return jsonResponse({
      success: true, screening_id: screeningId, report: finalReport,
      timestamp: new Date().toISOString(), model_id: usedModel ? MODEL_ID : null,
      adapter_id: "medgemma_pediscreen_v1", model_used: usedModel,
      fallback: isFallback, fallback_to: isFallback ? "mock-v1.1" : null,
      confidence: finalReport.confidence, trace_id: traceId,
      version: AGENT_VERSION,
    }, 200, rlH);
  } catch (err) {
    console.error("[analyze] error:", err);
    errorCode = "INTERNAL_ERROR";
    const totalLatency = performance.now() - start;
    Promise.all([
      recordMetric("analyze", "error", totalLatency, errorCode),
      recordAIEvent({
        event_type: "inference", fallback: true, fallback_reason: "internal_error",
        latency_ms: Math.round(totalLatency), status_code: 500, error_code: errorCode,
        agent: AGENT_VERSION, trace_id: traceId,
      }),
    ]).catch(() => {});
    return errorResponse(errorCode, String(err), 500, traceId, rlH);
  }
});
