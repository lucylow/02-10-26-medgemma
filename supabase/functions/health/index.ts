// supabase/functions/health/index.ts
/**
 * Health check with DB connectivity test and last-hour metrics summary.
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

  const start = performance.now();

  try {
    // Test DB connectivity
    const { error: dbErr } = await supabase.from("screenings").select("id").limit(1);
    const dbHealthy = !dbErr;

    // Fetch last-hour metrics summary
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: metrics } = await supabase
      .from("edge_metrics")
      .select("handler, status, latency_ms")
      .gte("created_at", oneHourAgo);

    const metricsSummary: Record<string, { invocations: number; successes: number; totalLatency: number; count: number }> = {};
    for (const m of metrics || []) {
      if (!metricsSummary[m.handler]) {
        metricsSummary[m.handler] = { invocations: 0, successes: 0, totalLatency: 0, count: 0 };
      }
      const h = metricsSummary[m.handler];
      h.invocations++;
      if (m.status === "success" || m.status === "idempotent_hit") h.successes++;
      if (m.latency_ms) {
        h.totalLatency += m.latency_ms;
        h.count++;
      }
    }

    const lastHourMetrics = Object.entries(metricsSummary).map(([handler, s]) => ({
      handler,
      invocations: s.invocations,
      success_rate: s.invocations > 0 ? Math.round((s.successes / s.invocations) * 100) : 0,
      avg_latency_ms: s.count > 0 ? Math.round(s.totalLatency / s.count) : 0,
    }));

    const latency = Math.round(performance.now() - start);

    return new Response(
      JSON.stringify({
        healthy: dbHealthy,
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        service: "pediscreen-edge",
        db_connected: dbHealthy,
        ai_configured: !!Deno.env.get("LOVABLE_API_KEY"),
        latency_ms: latency,
        last_hour_metrics: lastHourMetrics,
      }),
      { status: dbHealthy ? 200 : 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("health error:", err);
    return new Response(
      JSON.stringify({
        healthy: false,
        error: String(err),
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
