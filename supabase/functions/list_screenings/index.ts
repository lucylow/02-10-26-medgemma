// supabase/functions/list_screenings/index.ts
/**
 * GET /list_screenings — Paginated screening list with filtering.
 * Cursor pagination, time-range, risk filter, mock exclusion.
 * Rate-limited and traced.
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
    await recordMetric("list_screenings", "rate_limited", performance.now() - start, "RATE_LIMITED");
    return errorResponse("RATE_LIMITED", "Too many requests", 429, traceId, { ...rlH, "Retry-After": "60" });
  }

  try {
    if (req.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only GET is supported", 405, traceId, rlH);
    }

    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "50")));
    const cursor = url.searchParams.get("cursor");
    const page = Number(url.searchParams.get("page") || "0");
    const riskFilter = url.searchParams.get("risk");
    const since = url.searchParams.get("since") || url.searchParams.get("from");
    const until = url.searchParams.get("to");
    const lastHour = url.searchParams.get("last_hour") === "true";
    const excludeMock = url.searchParams.get("exclude_mock") === "true";

    let query = supabase
      .from("screenings")
      .select("screening_id, child_age_months, domain, risk_level, confidence, status, model_id, adapter_id, is_mock, created_at, input_hash", { count: "exact" })
      .order("created_at", { ascending: false });

    if (cursor) {
      query = query.lt("created_at", cursor);
    } else if (page > 0) {
      query = query.range(page * limit, page * limit + limit - 1);
    }

    if (lastHour) {
      query = query.gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    } else if (since) {
      query = query.gte("created_at", since);
    }
    if (until) query = query.lte("created_at", until);

    if (riskFilter && ["low", "medium", "high", "monitor", "refer"].includes(riskFilter)) {
      query = query.eq("risk_level", riskFilter);
    }
    if (excludeMock) query = query.eq("is_mock", false);
    if (!cursor || page === 0) query = query.limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error("[list_screenings] query error:", error);
      await recordMetric("list_screenings", "error", performance.now() - start, "db_query");
      return errorResponse("DB_QUERY_FAILED", error.message, 500, traceId, rlH);
    }

    const items = data || [];
    const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;

    // Risk distribution from returned page
    const riskCounts: Record<string, number> = {};
    for (const s of items) {
      const r = (s.risk_level as string) || "unknown";
      riskCounts[r] = (riskCounts[r] || 0) + 1;
    }

    recordMetric("list_screenings", "success", performance.now() - start).catch(() => {});

    return jsonResponse({
      items,
      pagination: { total: count || 0, limit, next_cursor: nextCursor, has_more: !!nextCursor },
      risk_summary: riskCounts,
      trace_id: traceId,
    }, 200, { ...rlH, "Cache-Control": "private, max-age=5" });
  } catch (err) {
    console.error("[list_screenings] error:", err);
    recordMetric("list_screenings", "error", performance.now() - start, "internal").catch(() => {});
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, rlH);
  }
});
