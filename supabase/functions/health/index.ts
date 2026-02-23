// supabase/functions/health/index.ts
/**
 * GET /health — Comprehensive health check v4.0.
 * Probes: DB, AI gateway, PSI drift, consent system, last-hour metrics.
 * Powers uptime monitors and synthetic canaries.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, corsResponse, supabase, extractTraceId, withDeadline,
  LOVABLE_API_KEY, EDGE_VERSION, AGENT_VERSION,
} from "../_shared/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const traceId = extractTraceId(req);

  try {
    const [dbCheck, aiGatewayCheck, metricsCheck, lastEventCheck, driftCheck, consentCheck, orgCheck] = await Promise.all([
      // DB connectivity + row count
      (async () => {
        const t = performance.now();
        try {
          const { count, error } = await withDeadline(
            supabase.from("screenings").select("id", { count: "exact", head: true }),
            3000,
          );
          return { connected: !error, latency_ms: Math.round(performance.now() - t), total_screenings: count || 0 };
        } catch {
          return { connected: false, latency_ms: Math.round(performance.now() - t), total_screenings: 0 };
        }
      })(),

      // AI gateway probe
      (async () => {
        if (!LOVABLE_API_KEY) return { status: "unconfigured", latency_ms: 0 };
        const t = performance.now();
        try {
          const resp = await withDeadline(
            fetch("https://ai.gateway.lovable.dev/v1/models", {
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
            }),
            3000,
          );
          await resp.text();
          return { status: resp.ok ? "ok" : `error_${resp.status}`, latency_ms: Math.round(performance.now() - t) };
        } catch (e) {
          const status = e instanceof Error && e.message === "DEADLINE_EXCEEDED" ? "timeout" : "unreachable";
          return { status, latency_ms: Math.round(performance.now() - t) };
        }
      })(),

      // Last-hour edge metrics summary
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

      // Last AI event timestamp
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
        if (!data) return { status: "no_data", drift_detected: false };
        return { ...data, drift_detected: (data.psi_score ?? 0) > 0.2, status: "ok" };
      })(),

      // Consent system check
      (async () => {
        try {
          const { count, error } = await supabase.from("consents").select("id", { count: "exact", head: true });
          return { available: !error, total_consents: count || 0 };
        } catch {
          return { available: false, total_consents: 0 };
        }
      })(),

      // Organizations check
      (async () => {
        try {
          const { count, error } = await supabase.from("organizations").select("id", { count: "exact", head: true });
          return { available: !error, total_orgs: count || 0 };
        } catch {
          return { available: false, total_orgs: 0 };
        }
      })(),
    ]);

    const healthy = dbCheck.connected && aiGatewayCheck.status !== "unreachable";
    const driftAlert = driftCheck?.drift_detected ?? false;

    // Compute overall system status
    let status = "ok";
    if (!healthy) status = "degraded";
    else if (driftAlert) status = "drift_warning";
    else if (aiGatewayCheck.status !== "ok" && aiGatewayCheck.status !== "unconfigured") status = "partial";

    return new Response(
      JSON.stringify({
        status,
        healthy,
        timestamp: new Date().toISOString(),
        trace_id: traceId,
        versions: {
          edge: EDGE_VERSION,
          agent: AGENT_VERSION,
          model_proxy: aiGatewayCheck.status,
        },
        checks: {
          db: dbCheck,
          ai_gateway: aiGatewayCheck,
          drift: driftCheck,
          consent_system: consentCheck,
          organizations: orgCheck,
        },
        last_model_check: lastEventCheck?.timestamp || null,
        last_hour_metrics: metricsCheck,
        alerts: {
          drift_warning: driftAlert,
          gateway_down: aiGatewayCheck.status === "unreachable",
          db_down: !dbCheck.connected,
          no_recent_inferences: !lastEventCheck,
        },
        latency_ms: Math.round(performance.now() - start),
      }),
      {
        status: healthy ? 200 : 503,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-cache, no-store" },
      },
    );
  } catch (err) {
    console.error("[health] error:", err);
    return new Response(
      JSON.stringify({ status: "error", healthy: false, error: String(err), trace_id: traceId }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
