// supabase/functions/metrics_dashboard/index.ts
/**
 * Real-time metrics dashboard endpoint.
 * Returns last-hour invocation stats grouped by handler.
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const windowMinutes = Math.min(1440, Number(url.searchParams.get("window") || "60"));
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { data: metrics, error } = await supabase
      .from("edge_metrics")
      .select("handler, status, latency_ms, error_code, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate by handler
    const agg: Record<string, {
      invocations: number;
      successes: number;
      errors: number;
      totalLatency: number;
      latencyCount: number;
      errorCodes: Record<string, number>;
    }> = {};

    for (const m of metrics || []) {
      if (!agg[m.handler]) {
        agg[m.handler] = { invocations: 0, successes: 0, errors: 0, totalLatency: 0, latencyCount: 0, errorCodes: {} };
      }
      const h = agg[m.handler];
      h.invocations++;
      if (m.status === "success" || m.status === "idempotent_hit") {
        h.successes++;
      } else {
        h.errors++;
        if (m.error_code) {
          h.errorCodes[m.error_code] = (h.errorCodes[m.error_code] || 0) + 1;
        }
      }
      if (m.latency_ms) {
        h.totalLatency += m.latency_ms;
        h.latencyCount++;
      }
    }

    const handlers = Object.entries(agg).map(([handler, s]) => ({
      handler,
      invocations: s.invocations,
      success_rate: s.invocations > 0 ? Math.round((s.successes / s.invocations) * 10000) / 100 : 100,
      error_rate: s.invocations > 0 ? Math.round((s.errors / s.invocations) * 10000) / 100 : 0,
      avg_latency_ms: s.latencyCount > 0 ? Math.round(s.totalLatency / s.latencyCount) : 0,
      error_codes: s.errorCodes,
    }));

    const totalInvocations = handlers.reduce((s, h) => s + h.invocations, 0);
    const totalErrors = handlers.reduce((s, h) => s + Math.round(h.invocations * h.error_rate / 100), 0);

    return new Response(
      JSON.stringify({
        window_minutes: windowMinutes,
        since,
        total_invocations: totalInvocations,
        overall_error_rate: totalInvocations > 0 ? Math.round((totalErrors / totalInvocations) * 10000) / 100 : 0,
        handlers,
        last_updated: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("metrics dashboard error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
