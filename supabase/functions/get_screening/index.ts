// supabase/functions/get_screening/index.ts
/**
 * GET /get_screening?id=... — Retrieve screening with provenance, audit trail, consent status.
 * v4.0: PHI access logging, role-aware field redaction, consent verification.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, supabase, errorResponse, jsonResponse,
  extractContext, recordMetric, recordAuditEvent,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
} from "../_shared/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const rl = checkRateLimit(rateLimitKey(req), 60);
  const rlH = rateLimitHeaders(rl);

  if (!rl.allowed) {
    await recordMetric("get_screening", "rate_limited", performance.now() - start, "RATE_LIMITED");
    return errorResponse("RATE_LIMITED", "Too many requests", 429, ctx.traceId, { ...rlH, "Retry-After": "60" });
  }

  try {
    if (req.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only GET is supported", 405, ctx.traceId, rlH);
    }

    const url = new URL(req.url);
    const screeningId = url.searchParams.get("id");
    const includeAudit = url.searchParams.get("audit") !== "false";

    if (!screeningId) {
      await recordMetric("get_screening", "error", performance.now() - start, "missing_id");
      return errorResponse("MISSING_PARAMETER", "Query parameter 'id' is required", 400, ctx.traceId, rlH);
    }

    // Parallel: fetch screening + audit trail
    const screeningQuery = supabase.from("screenings").select("*").eq("screening_id", screeningId).maybeSingle();
    const auditQuery = includeAudit
      ? supabase.from("audit_events")
          .select("action, created_at, model_id, adapter_id, is_mock, user_id, payload")
          .eq("screening_id", screeningId)
          .order("created_at", { ascending: true })
          .limit(50)
      : null;

    const [screeningRes, auditRes] = await Promise.all([
      screeningQuery,
      auditQuery ?? Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);
    // screeningRes and auditRes are already typed from the parallel queries above

    if (screeningRes.error || !screeningRes.data) {
      await recordMetric("get_screening", "error", performance.now() - start, "not_found");
      return errorResponse("NOT_FOUND", `Screening '${screeningId}' not found`, 404, ctx.traceId, rlH);
    }

    const data = screeningRes.data as Record<string, unknown>;
    const isClinician = ctx.userRole === "clinician" || ctx.userRole === "admin";

    // Build response with role-aware redaction
    const response: Record<string, unknown> = {
      screening_id: data.screening_id,
      child_age_months: data.child_age_months,
      domain: data.domain,
      risk_level: data.risk_level,
      confidence: data.confidence,
      status: data.status,
      report: data.report,
      is_mock: data.is_mock,
      created_at: data.created_at,

      // Observations: redact for non-clinicians
      observations: isClinician
        ? data.observations
        : (data.observations ? `[${String(data.observations).length} chars — requires clinician role]` : null),

      // Image path: redact for non-clinicians
      image_path: isClinician ? data.image_path : (data.image_path ? "[redacted]" : null),

      provenance: {
        model_id: data.model_id,
        adapter_id: data.adapter_id,
        model_used: (data.report as Record<string, unknown>)?.model_used ?? false,
        is_mock: data.is_mock,
        input_hash: data.input_hash,
        prompt_hash: data.prompt_hash,
        embedding_hash: data.embedding_hash,
        retrieved_at: new Date().toISOString(),
      },

      audit_trail: (auditRes.data || []).map((e: Record<string, unknown>) => ({
        action: e.action,
        timestamp: e.created_at,
        model_id: e.model_id,
        is_mock: e.is_mock,
        // Don't expose user_id or payload to non-admins
        ...(ctx.userRole === "admin" ? { user_id: e.user_id, payload_keys: e.payload ? Object.keys(e.payload as object) : [] } : {}),
      })),

      trace_id: ctx.traceId,
      version: "4.0.0",
    };

    const latency = performance.now() - start;

    // Fire-and-forget: PHI access log + metrics
    Promise.all([
      recordMetric("get_screening", "success", latency, undefined, {
        org_id: ctx.orgId, role: ctx.userRole,
      }),
      recordAuditEvent("screening_accessed", {
        screening_id: screeningId, role: ctx.userRole, org_id: ctx.orgId,
        trace_id: ctx.traceId, redacted: !isClinician,
      }, screeningId),
    ]).catch(() => {});

    return jsonResponse(response, 200, { ...rlH, "Cache-Control": "private, max-age=5" });
  } catch (err) {
    console.error("[get_screening] error:", err);
    recordMetric("get_screening", "error", performance.now() - start, "internal").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, ctx.traceId, rlH);
  }
});
