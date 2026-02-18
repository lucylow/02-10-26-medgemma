// supabase/functions/health/index.ts
/**
 * Health check — DB connectivity, AI gateway probe, last-hour metrics.
 * Powers uptime monitors and synthetic canaries.
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
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const EDGE_VERSION = "2.1.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = performance.now();
  const traceId = req.headers.get("x-request-id") || crypto.randomUUID();

  try {
    // 1) DB connectivity
    const dbStart = performance.now();
    const { error: dbErr } = await supabase.from("screenings").select("id").limit(1);
    const dbLatency = Math.round(performance.now() - dbStart);
    const dbHealthy = !dbErr;

    // 2) AI gateway probe (lightweight — just check reachability, don't consume tokens)
    let modelProxyStatus = "unconfigured";
    let modelProbeLatency = 0;
    if (LOVABLE_API_KEY) {
      const probeStart = performance.now();
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 3000);
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/models", {
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
          signal: ctrl.signal,
        });
        clearTimeout(timeout);
        await resp.text(); // consume body
        modelProxyStatus = resp.ok ? "ok" : `error_${resp.status}`;
      } catch (e) {
        modelProxyStatus = e instanceof DOMException && e.name === "AbortError" ? "timeout" : "unreachable";
      }
      modelProbeLatency = Math.round(performance.now() - probeStart);
    }

    // 3) Last-hour metrics summary
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: metrics } = await supabase
      .from("edge_metrics")
      .select("handler, status, latency_ms")
      .gte("created_at", oneHourAgo);

    const summary: Record<string, { invocations: number; successes: number; totalLatency: number; count: number }> = {};
    for (const m of metrics || []) {
      if (!summary[m.handler]) summary[m.handler] = { invocations: 0, successes: 0, totalLatency: 0, count: 0 };
      const h = summary[m.handler];
      h.invocations++;
      if (m.status === "success" || m.status === "idempotent_hit") h.successes++;
      if (m.latency_ms) { h.totalLatency += m.latency_ms; h.count++; }
    }

    const lastHourMetrics = Object.entries(summary).map(([handler, s]) => ({
      handler,
      invocations: s.invocations,
      success_rate: s.invocations > 0 ? Math.round((s.successes / s.invocations) * 100) : 0,
      avg_latency_ms: s.count > 0 ? Math.round(s.totalLatency / s.count) : 0,
    }));

    // 4) Last model check from ai_events
    const { data: lastEvent } = await supabase
      .from("ai_events")
      .select("timestamp, model_id")
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    const healthy = dbHealthy && modelProxyStatus !== "unreachable";
    const latency = Math.round(performance.now() - start);

    return new Response(
      JSON.stringify({
        status: healthy ? "ok" : "degraded",
        healthy,
        timestamp: new Date().toISOString(),
        trace_id: traceId,
        versions: {
          edge: EDGE_VERSION,
          model_proxy: modelProxyStatus,
        },
        checks: {
          db: { connected: dbHealthy, latency_ms: dbLatency },
          ai_gateway: { status: modelProxyStatus, latency_ms: modelProbeLatency },
        },
        last_model_check: lastEvent?.timestamp || null,
        last_hour_metrics: lastHourMetrics,
        latency_ms: latency,
      }),
      { status: healthy ? 200 : 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("health error:", err);
    return new Response(
      JSON.stringify({
        status: "error",
        healthy: false,
        error: String(err),
        trace_id: traceId,
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
