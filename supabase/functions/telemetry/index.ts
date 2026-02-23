// supabase/functions/telemetry/index.ts
/**
 * GET /telemetry — AI usage analytics API v4.0.
 * Actions: overview, models, errors, fallbacks, drift, consent, screenings.
 * Rate-limited, traced, org-aware.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse, supabase, errorResponse, jsonResponse,
  extractContext, parseRange, recordMetric,
  checkRateLimit, rateLimitHeaders, rateLimitKey, bucketize,
} from "../_shared/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const ctx = extractContext(req);
  const rl = checkRateLimit(rateLimitKey(req), 60);
  const rlH = rateLimitHeaders(rl);

  if (!rl.allowed) {
    recordMetric("telemetry", "rate_limited", 0, "RATE_LIMITED").catch(() => {});
    return errorResponse("RATE_LIMITED", "Too many requests", 429, ctx.traceId, { ...rlH, "Retry-After": "60" });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "overview";
    const range = url.searchParams.get("range") || "7d";
    const windowMinutes = Math.min(90 * 24 * 60, parseRange(range));
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    let result: Response;
    switch (action) {
      case "overview": result = await handleOverview(since, windowMinutes, ctx.traceId); break;
      case "models": result = await handleModels(since, ctx.traceId); break;
      case "errors": result = await handleErrors(since, ctx.traceId); break;
      case "fallbacks": result = await handleFallbacks(since, ctx.traceId); break;
      case "drift": result = await handleDrift(since, ctx.traceId); break;
      case "consent": result = await handleConsent(ctx.traceId); break;
      case "screenings": result = await handleScreeningStats(since, ctx.traceId); break;
      default: result = errorResponse("UNKNOWN_ACTION", "Use: overview, models, errors, fallbacks, drift, consent, screenings", 400, ctx.traceId, rlH);
    }

    for (const [k, v] of Object.entries(rlH)) {
      result.headers.set(k, v);
    }
    return result;
  } catch (err) {
    console.error("[telemetry] error:", err);
    return errorResponse("INTERNAL_ERROR", String(err), 500, ctx.traceId, rlH);
  }
});

async function handleOverview(since: string, windowMinutes: number, traceId: string) {
  const [eventsRes, driftRes, screeningCountRes] = await Promise.all([
    supabase.from("ai_events").select("*").gte("timestamp", since).order("timestamp", { ascending: true }),
    supabase.from("embedding_stats").select("psi_score, recorded_at, model_id").order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("screenings").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);

  if (eventsRes.error) return jsonResponse({ error_code: "QUERY_FAILED", message: eventsRes.error.message, trace_id: traceId }, 500);

  const items = eventsRes.data || [];
  const totalRequests = items.length;
  const successCount = items.filter(e => (e.status_code || 200) < 400).length;
  const errorCount = items.filter(e => (e.status_code || 200) >= 400).length;
  const fallbackCount = items.filter(e => e.fallback).length;
  const latencies = items.filter(e => e.latency_ms != null).map(e => e.latency_ms!);
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const totalCost = items.reduce((sum, e) => sum + (Number(e.cost_estimate_usd) || 0), 0);
  const modelSet = new Set(items.filter(e => e.model_id).map(e => e.model_id));
  const modelCounts: Record<string, number> = {};
  items.forEach(e => { if (e.model_id) modelCounts[e.model_id] = (modelCounts[e.model_id] || 0) + 1; });
  const topModelEntry = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const activeConnection = items.some(e => e.timestamp >= fiveMinAgo);
  const lastUsed = items.length > 0 ? items[items.length - 1].timestamp : null;

  const timeseries: Record<string, { calls: number; errors: number; fallbacks: number; cost: number }> = {};
  items.forEach(e => {
    const day = e.timestamp.slice(0, 10);
    if (!timeseries[day]) timeseries[day] = { calls: 0, errors: 0, fallbacks: 0, cost: 0 };
    timeseries[day].calls++;
    if ((e.status_code || 200) >= 400) timeseries[day].errors++;
    if (e.fallback) timeseries[day].fallbacks++;
    timeseries[day].cost += Number(e.cost_estimate_usd) || 0;
  });
  const timeseriesArray = Object.entries(timeseries)
    .map(([date, data]) => ({ date, ...data, cost: Math.round(data.cost * 1000000) / 1000000 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const alerts: string[] = [];
  if (p95 > 2000) alerts.push("p95_latency_above_2s");
  if (totalRequests > 0 && errorCount / totalRequests > 0.01) alerts.push("error_rate_above_1pct");
  if (totalRequests > 0 && fallbackCount / totalRequests > 0.05) alerts.push("fallback_rate_above_5pct");
  if (driftRes.data && (driftRes.data.psi_score ?? 0) > 0.2) alerts.push("psi_drift_detected");

  return jsonResponse({
    active_connection: activeConnection, last_used: lastUsed, total_requests: totalRequests,
    success_count: successCount, error_count: errorCount, fallback_count: fallbackCount,
    avg_latency_ms: avgLatency, p50_latency_ms: p50, p95_latency_ms: p95, p99_latency_ms: p99,
    total_cost_usd: Math.round(totalCost * 1000000) / 1000000,
    total_screenings: screeningCountRes.count || 0,
    number_of_models: modelSet.size,
    top_model: topModelEntry ? { model_id: topModelEntry[0], calls: topModelEntry[1] } : null,
    drift: driftRes.data ? { psi_score: driftRes.data.psi_score, recorded_at: driftRes.data.recorded_at, model_id: driftRes.data.model_id } : null,
    latency_histogram: bucketize(latencies),
    timeseries: timeseriesArray, alerts,
    window_minutes: windowMinutes, since, trace_id: traceId,
    last_updated: new Date().toISOString(),
    version: "4.0.0",
  });
}

async function handleModels(since: string, traceId: string) {
  const { data: events, error } = await supabase.from("ai_events")
    .select("model_id, model_provider, adapter_id, latency_ms, status_code, fallback, cost_estimate_usd, timestamp")
    .gte("timestamp", since).not("model_id", "is", null);
  if (error) return jsonResponse({ error_code: "QUERY_FAILED", message: error.message, trace_id: traceId }, 500);

  const models: Record<string, {
    model_id: string; provider: string; calls: number; errors: number; fallbacks: number;
    totalLatency: number; latencyCount: number; totalCost: number; adapters: Set<string>; lastUsed: string;
  }> = {};

  (events || []).forEach(e => {
    const mid = e.model_id!;
    if (!models[mid]) models[mid] = { model_id: mid, provider: e.model_provider || "unknown", calls: 0, errors: 0, fallbacks: 0, totalLatency: 0, latencyCount: 0, totalCost: 0, adapters: new Set(), lastUsed: e.timestamp };
    const m = models[mid];
    m.calls++;
    if ((e.status_code || 200) >= 400) m.errors++;
    if (e.fallback) m.fallbacks++;
    if (e.latency_ms) { m.totalLatency += e.latency_ms; m.latencyCount++; }
    m.totalCost += Number(e.cost_estimate_usd) || 0;
    if (e.adapter_id) m.adapters.add(e.adapter_id);
    if (e.timestamp > m.lastUsed) m.lastUsed = e.timestamp;
  });

  return jsonResponse({
    models: Object.values(models).map(m => ({
      model_id: m.model_id, provider: m.provider, calls: m.calls,
      avg_latency_ms: m.latencyCount > 0 ? Math.round(m.totalLatency / m.latencyCount) : 0,
      error_rate: m.calls > 0 ? Math.round((m.errors / m.calls) * 10000) / 100 : 0,
      fallback_rate: m.calls > 0 ? Math.round((m.fallbacks / m.calls) * 10000) / 100 : 0,
      cost_estimate_usd: Math.round(m.totalCost * 1000000) / 1000000,
      adapters: [...m.adapters], last_used: m.lastUsed,
    })).sort((a, b) => b.calls - a.calls),
    since, trace_id: traceId,
  });
}

async function handleErrors(since: string, traceId: string) {
  const { data, error } = await supabase.from("ai_events")
    .select("id, timestamp, model_id, error_code, status_code, fallback_reason, latency_ms, trace_id, input_hash")
    .gte("timestamp", since).or("status_code.gte.400,error_code.not.is.null")
    .order("timestamp", { ascending: false }).limit(100);
  if (error) return jsonResponse({ error_code: "QUERY_FAILED", message: error.message, trace_id: traceId }, 500);

  const errorCodes: Record<string, number> = {};
  (data || []).forEach(e => {
    const code = e.error_code || `http_${e.status_code}`;
    errorCodes[code] = (errorCodes[code] || 0) + 1;
  });

  return jsonResponse({ errors: data || [], error_summary: errorCodes, total: (data || []).length, since, trace_id: traceId });
}

async function handleFallbacks(since: string, traceId: string) {
  const { data, error } = await supabase.from("ai_events")
    .select("id, timestamp, model_id, fallback_reason, screening_id, latency_ms, trace_id, input_hash")
    .gte("timestamp", since).eq("fallback", true)
    .order("timestamp", { ascending: false }).limit(100);
  if (error) return jsonResponse({ error_code: "QUERY_FAILED", message: error.message, trace_id: traceId }, 500);

  const reasonCounts: Record<string, number> = {};
  (data || []).forEach(e => { const r = e.fallback_reason || "unknown"; reasonCounts[r] = (reasonCounts[r] || 0) + 1; });
  return jsonResponse({ fallbacks: data || [], reason_summary: reasonCounts, total: (data || []).length, since, trace_id: traceId });
}

async function handleDrift(since: string, traceId: string) {
  const { data, error } = await supabase.from("embedding_stats")
    .select("psi_score, mean_norm, std_norm, n_samples, recorded_at, model_id, adapter_id, meta")
    .gte("recorded_at", since).order("recorded_at", { ascending: false }).limit(100);
  if (error) return jsonResponse({ error_code: "QUERY_FAILED", message: error.message, trace_id: traceId }, 500);

  const timeline = (data || []).map(d => ({
    ...d,
    alert: (d.psi_score ?? 0) > 0.2,
    severity: (d.psi_score ?? 0) > 0.5 ? "critical" : (d.psi_score ?? 0) > 0.2 ? "warning" : "ok",
  }));
  return jsonResponse({
    drift_records: timeline, latest: timeline[0] || null,
    drift_detected: timeline.some(d => d.alert),
    critical_drift: timeline.some(d => d.severity === "critical"),
    since, trace_id: traceId,
  });
}

async function handleConsent(traceId: string) {
  const { data, error } = await supabase.from("consents")
    .select("purpose, granted, created_at, expires_at, revoked_at")
    .order("created_at", { ascending: false }).limit(200);
  if (error) return jsonResponse({ error_code: "QUERY_FAILED", message: error.message, trace_id: traceId }, 500);

  const purposeSummary: Record<string, { granted: number; revoked: number; expired: number; total: number }> = {};
  const now = new Date();
  for (const c of data || []) {
    const p = c.purpose || "unknown";
    if (!purposeSummary[p]) purposeSummary[p] = { granted: 0, revoked: 0, expired: 0, total: 0 };
    purposeSummary[p].total++;
    if (c.revoked_at) purposeSummary[p].revoked++;
    else if (c.expires_at && new Date(c.expires_at) < now) purposeSummary[p].expired++;
    else if (c.granted) purposeSummary[p].granted++;
  }

  return jsonResponse({
    consent_records: (data || []).length,
    purpose_summary: purposeSummary,
    trace_id: traceId,
  });
}

async function handleScreeningStats(since: string, traceId: string) {
  const { data, error, count } = await supabase.from("screenings")
    .select("risk_level, domain, is_mock, confidence, model_id, status, created_at", { count: "exact" })
    .gte("created_at", since).order("created_at", { ascending: false }).limit(1000);
  if (error) return jsonResponse({ error_code: "QUERY_FAILED", message: error.message, trace_id: traceId }, 500);

  const items = data || [];
  const riskDist: Record<string, number> = {};
  const domainDist: Record<string, number> = {};
  const statusDist: Record<string, number> = {};
  let mockCount = 0;
  let totalConf = 0;
  let confCount = 0;

  for (const s of items) {
    riskDist[s.risk_level || "unknown"] = (riskDist[s.risk_level || "unknown"] || 0) + 1;
    domainDist[s.domain || "general"] = (domainDist[s.domain || "general"] || 0) + 1;
    statusDist[s.status || "unknown"] = (statusDist[s.status || "unknown"] || 0) + 1;
    if (s.is_mock) mockCount++;
    if (s.confidence != null) { totalConf += Number(s.confidence); confCount++; }
  }

  return jsonResponse({
    total: count || items.length,
    risk_distribution: riskDist,
    domain_distribution: domainDist,
    status_distribution: statusDist,
    mock_count: mockCount,
    avg_confidence: confCount > 0 ? Math.round((totalConf / confCount) * 100) / 100 : null,
    since, trace_id: traceId,
  });
}
