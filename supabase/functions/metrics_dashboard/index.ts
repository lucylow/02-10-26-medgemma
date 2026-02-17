// supabase/functions/metrics_dashboard/index.ts
/**
 * Enhanced metrics dashboard: edge_metrics + ai_events telemetry.
 * Returns handler stats, model breakdown, cost totals, fallback summary.
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

    // Fetch edge_metrics and ai_events in parallel
    const [metricsRes, aiEventsRes] = await Promise.all([
      supabase
        .from("edge_metrics")
        .select("handler, status, latency_ms, error_code, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("ai_events")
        .select("model_id, latency_ms, cost_estimate_usd, fallback, fallback_reason, risk_level, confidence, status_code, is_mock, timestamp")
        .gte("timestamp", since)
        .order("timestamp", { ascending: false })
        .limit(1000),
    ]);

    if (metricsRes.error) {
      return new Response(JSON.stringify({ error_code: "metrics_query_failed", message: metricsRes.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate edge_metrics by handler
    const agg: Record<string, {
      invocations: number; successes: number; errors: number;
      totalLatency: number; latencyCount: number;
      errorCodes: Record<string, number>;
    }> = {};

    for (const m of metricsRes.data || []) {
      if (!agg[m.handler]) {
        agg[m.handler] = { invocations: 0, successes: 0, errors: 0, totalLatency: 0, latencyCount: 0, errorCodes: {} };
      }
      const h = agg[m.handler];
      h.invocations++;
      if (m.status === "success" || m.status === "idempotent_hit") {
        h.successes++;
      } else {
        h.errors++;
        if (m.error_code) h.errorCodes[m.error_code] = (h.errorCodes[m.error_code] || 0) + 1;
      }
      if (m.latency_ms) { h.totalLatency += m.latency_ms; h.latencyCount++; }
    }

    const handlers = Object.entries(agg).map(([handler, s]) => ({
      handler,
      invocations: s.invocations,
      success_rate: s.invocations > 0 ? Math.round((s.successes / s.invocations) * 10000) / 100 : 100,
      error_rate: s.invocations > 0 ? Math.round((s.errors / s.invocations) * 10000) / 100 : 0,
      avg_latency_ms: s.latencyCount > 0 ? Math.round(s.totalLatency / s.latencyCount) : 0,
      error_codes: s.errorCodes,
    }));

    // Aggregate ai_events for model breakdown
    const aiEvents = aiEventsRes.data || [];
    const modelBreakdown: Record<string, { calls: number; totalCost: number; fallbacks: number; totalLatency: number; latencyCount: number }> = {};
    let totalCostUsd = 0;
    let totalFallbacks = 0;
    const fallbackReasons: Record<string, number> = {};
    const riskDistribution: Record<string, number> = {};

    for (const e of aiEvents) {
      const mid = e.model_id || "baseline_fallback";
      if (!modelBreakdown[mid]) {
        modelBreakdown[mid] = { calls: 0, totalCost: 0, fallbacks: 0, totalLatency: 0, latencyCount: 0 };
      }
      const mb = modelBreakdown[mid];
      mb.calls++;
      if (e.cost_estimate_usd) { mb.totalCost += Number(e.cost_estimate_usd); totalCostUsd += Number(e.cost_estimate_usd); }
      if (e.fallback) { mb.fallbacks++; totalFallbacks++; }
      if (e.fallback_reason) fallbackReasons[e.fallback_reason] = (fallbackReasons[e.fallback_reason] || 0) + 1;
      if (e.latency_ms) { mb.totalLatency += e.latency_ms; mb.latencyCount++; }
      if (e.risk_level) riskDistribution[e.risk_level] = (riskDistribution[e.risk_level] || 0) + 1;
    }

    const models = Object.entries(modelBreakdown).map(([model_id, s]) => ({
      model_id,
      calls: s.calls,
      cost_usd: Math.round(s.totalCost * 10000) / 10000,
      fallback_rate: s.calls > 0 ? Math.round((s.fallbacks / s.calls) * 10000) / 100 : 0,
      avg_latency_ms: s.latencyCount > 0 ? Math.round(s.totalLatency / s.latencyCount) : 0,
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
        ai_telemetry: {
          total_inferences: aiEvents.length,
          total_cost_usd: Math.round(totalCostUsd * 10000) / 10000,
          total_fallbacks: totalFallbacks,
          fallback_rate: aiEvents.length > 0 ? Math.round((totalFallbacks / aiEvents.length) * 10000) / 100 : 0,
          fallback_reasons: fallbackReasons,
          risk_distribution: riskDistribution,
          models,
        },
        last_updated: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("metrics dashboard error:", err);
    return new Response(JSON.stringify({ error_code: "internal_error", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
