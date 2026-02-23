// supabase/functions/metrics_dashboard/index.ts
/**
 * GET /metrics_dashboard — Aggregated telemetry dashboard v4.0.
 * Handler stats, model breakdown, cost, fallback, consent,
 * latency histograms, PSI drift timeline, org stats, alerts.
 * Cached 10s.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, supabase, errorResponse, jsonResponse,
  extractContext, bucketize, recordMetric,
  checkRateLimit, rateLimitHeaders, rateLimitKey,
} from "../_shared/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const rl = checkRateLimit(rateLimitKey(req), 30);
  const rlH = rateLimitHeaders(rl);

  if (!rl.allowed) {
    recordMetric("metrics_dashboard", "rate_limited", 0, "RATE_LIMITED").catch(() => {});
    return errorResponse("RATE_LIMITED", "Too many requests", 429, ctx.traceId, { ...rlH, "Retry-After": "60" });
  }

  try {
    const url = new URL(req.url);
    const windowMinutes = Math.min(1440, Number(url.searchParams.get("window") || "60"));
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const [metricsRes, aiEventsRes, driftRes, screeningStatsRes, consentStatsRes] = await Promise.all([
      supabase.from("edge_metrics")
        .select("handler, status, latency_ms, error_code, created_at")
        .gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("ai_events")
        .select("model_id, latency_ms, cost_estimate_usd, fallback, fallback_reason, risk_level, confidence, status_code, is_mock, timestamp, org_id")
        .gte("timestamp", since).order("timestamp", { ascending: false }).limit(1000),
      supabase.from("embedding_stats")
        .select("psi_score, mean_norm, std_norm, n_samples, recorded_at, model_id, adapter_id")
        .gte("recorded_at", since).order("recorded_at", { ascending: false }).limit(100),
      // Screening volume stats
      supabase.from("screenings")
        .select("risk_level, is_mock, domain, created_at", { count: "exact" })
        .gte("created_at", since).limit(1000),
      // Consent stats
      supabase.from("consents")
        .select("granted, purpose", { count: "exact" })
        .limit(500),
    ]);

    if (metricsRes.error) {
      return errorResponse("METRICS_QUERY_FAILED", metricsRes.error.message, 500, ctx.traceId, rlH);
    }

    // ── Edge metrics aggregation ──────────────────────────────
    const agg: Record<string, {
      invocations: number; successes: number; errors: number;
      totalLatency: number; latencyCount: number; latencies: number[];
      errorCodes: Record<string, number>;
    }> = {};

    for (const m of metricsRes.data || []) {
      if (!agg[m.handler]) agg[m.handler] = { invocations: 0, successes: 0, errors: 0, totalLatency: 0, latencyCount: 0, latencies: [], errorCodes: {} };
      const h = agg[m.handler];
      h.invocations++;
      if (m.status === "success" || m.status === "idempotent_hit") h.successes++;
      else {
        h.errors++;
        if (m.error_code) h.errorCodes[m.error_code] = (h.errorCodes[m.error_code] || 0) + 1;
      }
      if (m.latency_ms) { h.totalLatency += m.latency_ms; h.latencyCount++; h.latencies.push(m.latency_ms); }
    }

    const handlers = Object.entries(agg).map(([handler, s]) => {
      const sorted = s.latencies.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      return {
        handler, invocations: s.invocations,
        success_rate: s.invocations > 0 ? Math.round((s.successes / s.invocations) * 10000) / 100 : 100,
        error_rate: s.invocations > 0 ? Math.round((s.errors / s.invocations) * 10000) / 100 : 0,
        avg_latency_ms: s.latencyCount > 0 ? Math.round(s.totalLatency / s.latencyCount) : 0,
        p50_latency_ms: p50, p95_latency_ms: p95, p99_latency_ms: p99,
        latency_histogram: bucketize(s.latencies),
        error_codes: s.errorCodes,
      };
    });

    // ── AI events / model breakdown ───────────────────────────
    const aiEvents = aiEventsRes.data || [];
    const modelBreakdown: Record<string, { calls: number; totalCost: number; fallbacks: number; totalLatency: number; latencyCount: number }> = {};
    let totalCostUsd = 0;
    let totalFallbacks = 0;
    const fallbackReasons: Record<string, number> = {};
    const riskDistribution: Record<string, number> = {};
    const allLatencies: number[] = [];
    const orgCounts: Record<string, number> = {};

    for (const e of aiEvents) {
      const mid = e.model_id || "baseline_fallback";
      if (!modelBreakdown[mid]) modelBreakdown[mid] = { calls: 0, totalCost: 0, fallbacks: 0, totalLatency: 0, latencyCount: 0 };
      const mb = modelBreakdown[mid];
      mb.calls++;
      if (e.cost_estimate_usd) { mb.totalCost += Number(e.cost_estimate_usd); totalCostUsd += Number(e.cost_estimate_usd); }
      if (e.fallback) { mb.fallbacks++; totalFallbacks++; }
      if (e.fallback_reason) fallbackReasons[e.fallback_reason] = (fallbackReasons[e.fallback_reason] || 0) + 1;
      if (e.latency_ms) { mb.totalLatency += e.latency_ms; mb.latencyCount++; allLatencies.push(e.latency_ms); }
      if (e.risk_level) riskDistribution[e.risk_level] = (riskDistribution[e.risk_level] || 0) + 1;
      if (e.org_id) orgCounts[e.org_id] = (orgCounts[e.org_id] || 0) + 1;
    }

    const models = Object.entries(modelBreakdown).map(([model_id, s]) => ({
      model_id, calls: s.calls,
      cost_usd: Math.round(s.totalCost * 10000) / 10000,
      fallback_rate: s.calls > 0 ? Math.round((s.fallbacks / s.calls) * 10000) / 100 : 0,
      avg_latency_ms: s.latencyCount > 0 ? Math.round(s.totalLatency / s.latencyCount) : 0,
    }));

    const totalInvocations = handlers.reduce((s, h) => s + h.invocations, 0);
    const totalErrors = handlers.reduce((s, h) => s + Math.round(h.invocations * h.error_rate / 100), 0);

    // ── PSI drift timeline ────────────────────────────────────
    const driftTimeline = (driftRes.data || []).map(d => ({
      recorded_at: d.recorded_at, psi_score: d.psi_score, mean_norm: d.mean_norm,
      std_norm: d.std_norm, n_samples: d.n_samples, model_id: d.model_id,
      adapter_id: d.adapter_id, alert: (d.psi_score ?? 0) > 0.2,
    }));

    // ── Screening volume stats ────────────────────────────────
    const screenings = screeningStatsRes.data || [];
    const screeningRiskDist: Record<string, number> = {};
    const screeningDomainDist: Record<string, number> = {};
    let screeningMockCount = 0;
    for (const s of screenings) {
      const r = s.risk_level || "unknown";
      screeningRiskDist[r] = (screeningRiskDist[r] || 0) + 1;
      const d = s.domain || "general";
      screeningDomainDist[d] = (screeningDomainDist[d] || 0) + 1;
      if (s.is_mock) screeningMockCount++;
    }

    // ── Consent stats ─────────────────────────────────────────
    const consents = consentStatsRes.data || [];
    const consentPurposes: Record<string, { granted: number; total: number }> = {};
    for (const c of consents) {
      const p = c.purpose || "unknown";
      if (!consentPurposes[p]) consentPurposes[p] = { granted: 0, total: 0 };
      consentPurposes[p].total++;
      if (c.granted) consentPurposes[p].granted++;
    }

    // ── Alerts ────────────────────────────────────────────────
    const alerts: string[] = [];
    const p95Overall = handlers.length > 0 ? Math.max(...handlers.map(h => h.p95_latency_ms)) : 0;
    if (p95Overall > 2000) alerts.push("p95_latency_above_2s");
    if (totalInvocations > 0 && totalErrors / totalInvocations > 0.01) alerts.push("error_rate_above_1pct");
    const fallbackRate = aiEvents.length > 0 ? totalFallbacks / aiEvents.length : 0;
    if (fallbackRate > 0.05) alerts.push("fallback_rate_above_5pct");
    if (driftTimeline[0]?.alert) alerts.push("psi_drift_detected");
    if (screeningMockCount > screenings.length * 0.5 && screenings.length > 10) alerts.push("high_mock_ratio");

    const latency = Math.round(performance.now() - start);
    recordMetric("metrics_dashboard", "success", latency).catch(() => {});

    return jsonResponse({
      window_minutes: windowMinutes, since, trace_id: ctx.traceId,
      total_invocations: totalInvocations,
      overall_error_rate: totalInvocations > 0 ? Math.round((totalErrors / totalInvocations) * 10000) / 100 : 0,
      handlers,
      ai_telemetry: {
        total_inferences: aiEvents.length,
        total_cost_usd: Math.round(totalCostUsd * 10000) / 10000,
        total_fallbacks: totalFallbacks,
        fallback_rate: aiEvents.length > 0 ? Math.round(fallbackRate * 10000) / 100 : 0,
        fallback_reasons: fallbackReasons,
        risk_distribution: riskDistribution,
        models,
        latency_histogram: bucketize(allLatencies),
        org_usage: orgCounts,
      },
      screening_stats: {
        total: screeningStatsRes.count || screenings.length,
        risk_distribution: screeningRiskDist,
        domain_distribution: screeningDomainDist,
        mock_count: screeningMockCount,
      },
      consent_stats: consentPurposes,
      drift: { latest: driftTimeline[0] || null, timeline: driftTimeline },
      alerts,
      last_updated: new Date().toISOString(),
      version: "4.0.0",
    }, 200, { ...rlH, "Cache-Control": "public, max-age=10" });
  } catch (err) {
    console.error("[metrics_dashboard] error:", err);
    return errorResponse("INTERNAL_ERROR", String(err), 500, ctx.traceId, rlH);
  }
});
