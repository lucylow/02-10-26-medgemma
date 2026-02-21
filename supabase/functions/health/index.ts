// supabase/functions/health/index.ts
/**
 * GET /health — Comprehensive health check.
 * Probes: DB, AI gateway, PSI drift, last-hour metrics.
 * Powers uptime monitors and synthetic canaries.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, corsResponse, supabase, extractTraceId,
  LOVABLE_API_KEY, EDGE_VERSION,
} from "../_shared/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const traceId = extractTraceId(req);

  try {
    const [dbCheck, aiGatewayCheck, metricsCheck, lastEventCheck, driftCheck] = await Promise.all([
      // DB connectivity
      (async () => {
        const t = performance.now();
        const { error } = await supabase.from("screenings").select("id").limit(1);
        return { connected: !error, latency_ms: Math.round(performance.now() - t) };
      })(),

      // AI gateway probe
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

      // Last-hour edge metrics
      (async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data } = await supabase.from("edge_metrics")
          .select("handler, status, latency_ms").gte("created_at", oneHourAgo);
        const summary: Record<string, { invocations: number; successes: number; totalLatency: number; count: number }> = {};
        for (const m of data || []) {
          if (!summary[m.handler]) summary[m.handler] = { invocations: 0, successes: 0, totalLatency: 0, count: 0 };
          const h = summary[m.handler];
          h.invocations++;
          if (m.status === "success" || m.status === "idempotent_hit") h.successes++;
          if (m.latency_ms) { h.totalLatency += m.latency_ms; h.count++; }
        }
        return Object.entries(summary).map(([handler, s]) => ({
          handler, invocations: s.invocations,
          success_rate: s.invocations > 0 ? Math.round((s.successes / s.invocations) * 100) : 0,
          avg_latency_ms: s.count > 0 ? Math.round(s.totalLatency / s.count) : 0,
        }));
      })(),

      // Last AI event
      (async () => {
        const { data } = await supabase.from("ai_events")
          .select("timestamp, model_id").order("timestamp", { ascending: false }).limit(1).maybeSingle();
        return data;
      })(),

      // Latest PSI drift
      (async () => {
        const { data } = await supabase.from("embedding_stats")
          .select("psi_score, mean_norm, std_norm, n_samples, recorded_at, model_id")
          .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
        if (!data) return null;
        return { ...data, drift_detected: (data.psi_score ?? 0) > 0.2 };
      })(),
    ]);

    const healthy = dbCheck.connected && aiGatewayCheck.status !== "unreachable";
    const driftAlert = driftCheck?.drift_detected ?? false;

    return new Response(
      JSON.stringify({
        status: healthy ? (driftAlert ? "drift_warning" : "ok") : "degraded",
        healthy,
        timestamp: new Date().toISOString(),
        trace_id: traceId,
        versions: { edge: EDGE_VERSION, model_proxy: aiGatewayCheck.status },
        checks: { db: dbCheck, ai_gateway: aiGatewayCheck, drift: driftCheck },
        last_model_check: lastEventCheck?.timestamp || null,
        last_hour_metrics: metricsCheck,
        alerts: {
          drift_warning: driftAlert,
          gateway_down: aiGatewayCheck.status === "unreachable",
          db_down: !dbCheck.connected,
        },
        latency_ms: Math.round(performance.now() - start),
      }),
      { status: healthy ? 200 : 503, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-cache" } },
    );
  } catch (err) {
    console.error("[health] error:", err);
    return new Response(
      JSON.stringify({ status: "error", healthy: false, error: String(err), trace_id: traceId }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
