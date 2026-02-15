// supabase/functions/list_screenings/index.ts
/**
 * List screenings with filtering, pagination, and summary counts.
 * Supports: last_hour=true, status filter, priority filter, limit/offset.
 * Logs invocation metrics.
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = performance.now();

  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const limit = Math.min(100, Number(url.searchParams.get("limit") || "50"));
    const page = Number(url.searchParams.get("page") || "0");
    const offset = page * limit;
    const lastHour = url.searchParams.get("last_hour") === "true";
    const since = lastHour
      ? new Date(Date.now() - 60 * 60 * 1000).toISOString()
      : url.searchParams.get("since") || null;
    const riskFilter = url.searchParams.get("risk") || null; // low, medium, high

    let query = supabase
      .from("screenings")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (since) {
      query = query.gte("created_at", since);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("list query error:", error);
      await recordMetric("list_screenings", "error", performance.now() - start, "db_query");
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute summary counts
    let items = data || [];

    // Client-side risk filtering (report.riskLevel is inside JSONB)
    if (riskFilter && ["low", "medium", "high"].includes(riskFilter)) {
      items = items.filter(
        (s: { report?: { riskLevel?: string } }) =>
          s.report?.riskLevel === riskFilter
      );
    }

    const totalCount = count || 0;
    const highCount = (data || []).filter(
      (s: { report?: { riskLevel?: string } }) => s.report?.riskLevel === "high"
    ).length;
    const mediumCount = (data || []).filter(
      (s: { report?: { riskLevel?: string } }) => s.report?.riskLevel === "medium"
    ).length;

    await recordMetric("list_screenings", "success", performance.now() - start);

    return new Response(
      JSON.stringify({
        items,
        counts: {
          total: totalCount,
          high_risk: highCount,
          medium_risk: mediumCount,
          page,
          limit,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("list error:", err);
    await recordMetric("list_screenings", "error", performance.now() - start, "internal");
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
