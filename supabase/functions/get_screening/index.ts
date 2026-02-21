// supabase/functions/get_screening/index.ts
/**
 * GET /get_screening?id=... — Retrieve a screening with provenance + audit trail.
 * Rate-limited, traced, with role-aware redaction hints.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, supabase, errorResponse, jsonResponse,
  extractTraceId, recordMetric,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
} from "../_shared/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const traceId = extractTraceId(req);
  const rl = checkRateLimit(rateLimitKey(req), 60);
  const rlH = rateLimitHeaders(rl);

  if (!rl.allowed) {
    await recordMetric("get_screening", "rate_limited", performance.now() - start, "RATE_LIMITED");
    return errorResponse("RATE_LIMITED", "Too many requests", 429, traceId, { ...rlH, "Retry-After": "60" });
  }

  try {
    if (req.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only GET is supported", 405, traceId, rlH);
    }

    const url = new URL(req.url);
    const screeningId = url.searchParams.get("id");

    if (!screeningId) {
      await recordMetric("get_screening", "error", performance.now() - start, "missing_id");
      return errorResponse("MISSING_PARAMETER", "Query parameter 'id' is required", 400, traceId, rlH);
    }

    // Parallel: fetch screening + audit trail
    const [screeningRes, auditRes] = await Promise.all([
      supabase.from("screenings").select("*").eq("screening_id", screeningId).single(),
      supabase.from("audit_events")
        .select("action, created_at, model_id, adapter_id, is_mock, user_id")
        .eq("screening_id", screeningId)
        .order("created_at", { ascending: true })
        .limit(50),
    ]);

    if (screeningRes.error || !screeningRes.data) {
      await recordMetric("get_screening", "error", performance.now() - start, "not_found");
      return errorResponse("NOT_FOUND", `Screening '${screeningId}' not found`, 404, traceId, rlH);
    }

    const data = screeningRes.data;

    const response = {
      ...data,
      // Redact raw observations for non-clinician callers (hint only; enforce server-side in production)
      observations: data.observations ? `[${data.observations.length} chars — redacted in API; use clinician role for full text]` : null,
      provenance: {
        model_id: data.model_id,
        adapter_id: data.adapter_id,
        model_used: data.report?.model_used ?? false,
        is_mock: data.is_mock,
        input_hash: data.input_hash,
        prompt_hash: data.prompt_hash,
        embedding_hash: data.embedding_hash,
        retrieved_at: new Date().toISOString(),
      },
      audit_trail: (auditRes.data || []).map((e) => ({
        action: e.action,
        timestamp: e.created_at,
        model_id: e.model_id,
        is_mock: e.is_mock,
      })),
      trace_id: traceId,
    };

    const latency = performance.now() - start;
    recordMetric("get_screening", "success", latency).catch(() => {});

    return jsonResponse(response, 200, { ...rlH, "Cache-Control": "private, max-age=5" });
  } catch (err) {
    console.error("[get_screening] error:", err);
    recordMetric("get_screening", "error", performance.now() - start, "internal").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
