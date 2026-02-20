// supabase/functions/health/index.ts
/**
 * Health check — DB, AI gateway, embedding drift (PSI), FL status, last-hour metrics.
 * Powers uptime monitors, synthetic canaries, and FL training dashboards.
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

const EDGE_VERSION = "2.2.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = performance.now();
  const traceId = req.headers.get("x-request-id") || crypto.randomUUID();

  try {
    // Run all checks in parallel
    const [dbCheck, aiGatewayCheck, metricsCheck, lastEventCheck, driftCheck] = await Promise.all([
      // 1) DB connectivity
      (async () => {
        const t = performance.now();
        const { error } = await supabase.from("screenings").select("id").limit(1);
        return { connected: !error, latency_ms: Math.round(performance.now() - t) };
      })(),

      // 2) AI gateway probe
      (async () => {
        if (!LOVABLE_API_KEY) return { status: "unconfigured", latency_ms: 0 };
        const t = performance.now();
        try {
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 3000);
          const resp = await fetch("https://ai.gateway.lovable.dev/v1/models", {
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
            signal: ctrl.signal,
          });
          clearTimeout(timeout);
          await resp.text();
          return { status: resp.ok ? "ok" : `error_${resp.status}`, latency_ms: Math.round(performance.now() - t) };
        } catch (e) {
          const status = e instanceof DOMException && e.name === "AbortError" ? "timeout" : "unreachable";
          return { status, latency_ms: Math.round(performance.now() - t) };
        }
      })(),

      // 3) Last-hour edge metrics
      (async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from("edge_metrics")
          .select("handler, status, latency_ms")
          .gte("created_at", oneHourAgo);
        const summary: Record<string, { invocations: number; successes: number; totalLatency: number; count: number }> = {};
        for (const m of data || []) {
          if (!summary[m.handler]) summary[m.handler] = { invocations: 0, successes: 0, totalLatency: 0, count: 0 };
          const h = summary[m.handler];
          h.invocations++;
          if (m.status === "success" || m.status === "idempotent_hit") h.successes++;
          if (m.latency_ms) { h.totalLatency += m.latency_ms; h.count++; }
        }
        return Object.entries(summary).map(([handler, s]) => ({
          handler,
          invocations: s.invocations,
          success_rate: s.invocations > 0 ? Math.round((s.successes / s.invocations) * 100) : 0,
          avg_latency_ms: s.count > 0 ? Math.round(s.totalLatency / s.count) : 0,
        }));
      })(),

      // 4) Last AI event
      (async () => {
        const { data } = await supabase
          .from("ai_events")
          .select("timestamp, model_id")
          .order("timestamp", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data;
      })(),

      // 5) Latest PSI drift score from embedding_stats
      (async () => {
        const { data } = await supabase
          .from("embedding_stats")
          .select("psi_score, mean_norm, std_norm, n_samples, recorded_at, model_id")
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!data) return null;
        return {
          psi_score: data.psi_score,
          mean_norm: data.mean_norm,
          std_norm: data.std_norm,
          n_samples: data.n_samples,
          recorded_at: data.recorded_at,
          model_id: data.model_id,
          drift_detected: (data.psi_score ?? 0) > 0.2,
        };
      })(),
    ]);

    const healthy = dbCheck.connected && aiGatewayCheck.status !== "unreachable";
    const driftAlert = driftCheck?.drift_detected ?? false;
    const latency = Math.round(performance.now() - start);

    return new Response(
      JSON.stringify({
        status: healthy ? (driftAlert ? "drift_warning" : "ok") : "degraded",
        healthy,
        timestamp: new Date().toISOString(),
        trace_id: traceId,
        versions: {
          edge: EDGE_VERSION,
          model_proxy: aiGatewayCheck.status,
        },
        checks: {
          db: dbCheck,
          ai_gateway: aiGatewayCheck,
          drift: driftCheck,
        },
        last_model_check: lastEventCheck?.timestamp || null,
        last_hour_metrics: metricsCheck,
        alerts: {
          drift_warning: driftAlert,
          gateway_down: aiGatewayCheck.status === "unreachable",
          db_down: !dbCheck.connected,
        },
        latency_ms: latency,
      }),
      { status: healthy ? 200 : 503, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-cache" } }
    );
  } catch (err) {
    console.error("health error:", err);
    return new Response(
      JSON.stringify({ status: "error", healthy: false, error: String(err), trace_id: traceId, timestamp: new Date().toISOString() }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
