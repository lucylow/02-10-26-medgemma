// supabase/functions/list_screenings/index.ts
/**
 * List screenings with cursor pagination, filtering, and summary counts.
 * Supports: cursor (created_at ISO), limit, risk filter, since/from/to.
 * Standardized error responses with trace propagation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function errorResponse(code: string, message: string, status: number, traceId: string) {
  return new Response(
    JSON.stringify({ error_code: code, message, trace_id: traceId }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function recordMetric(handler: string, status: string, latencyMs: number, errorCode?: string) {
  try {
    await supabase.from("edge_metrics").insert({
      handler, status, latency_ms: Math.round(latencyMs), error_code: errorCode || null,
    });
  } catch (e) {
    console.error("metric insert failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = performance.now();
  const traceId = req.headers.get("x-request-id") || crypto.randomUUID();

  try {
    if (req.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only GET is supported", 405, traceId);
    }

    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "50")));
    const cursor = url.searchParams.get("cursor"); // ISO timestamp for cursor pagination
    const page = Number(url.searchParams.get("page") || "0"); // legacy offset pagination
    const riskFilter = url.searchParams.get("risk");
    const since = url.searchParams.get("since") || url.searchParams.get("from");
    const until = url.searchParams.get("to");
    const lastHour = url.searchParams.get("last_hour") === "true";
    const excludeMock = url.searchParams.get("exclude_mock") === "true";

    let query = supabase
      .from("screenings")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Cursor pagination (preferred over offset)
    if (cursor) {
      query = query.lt("created_at", cursor);
    } else if (page > 0) {
      query = query.range(page * limit, page * limit + limit - 1);
    }

    // Time filters
    if (lastHour) {
      query = query.gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    } else if (since) {
      query = query.gte("created_at", since);
    }
    if (until) {
      query = query.lte("created_at", until);
    }

    // Risk filter at DB level using the risk_level column
    if (riskFilter && ["low", "medium", "high"].includes(riskFilter)) {
      query = query.eq("risk_level", riskFilter);
    }

    // Mock filter
    if (excludeMock) {
      query = query.eq("is_mock", false);
    }

    if (!cursor || page === 0) {
      query = query.limit(limit);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("list query error:", error);
      await recordMetric("list_screenings", "error", performance.now() - start, "db_query");
      return errorResponse("DB_QUERY_FAILED", error.message, 500, traceId);
    }

    const items = data || [];
    const totalCount = count || 0;

    // Compute next cursor from last item
    const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;

    // Risk distribution from returned page
    const riskCounts = { low: 0, medium: 0, high: 0 };
    for (const s of items) {
      const r = s.risk_level as string;
      if (r in riskCounts) riskCounts[r as keyof typeof riskCounts]++;
    }

    await recordMetric("list_screenings", "success", performance.now() - start);

    return new Response(
      JSON.stringify({
        items,
        pagination: {
          total: totalCount,
          limit,
          next_cursor: nextCursor,
          has_more: !!nextCursor,
        },
        risk_summary: riskCounts,
        trace_id: traceId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("list error:", err);
    await recordMetric("list_screenings", "error", performance.now() - start, "internal");
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId);
  }
});
