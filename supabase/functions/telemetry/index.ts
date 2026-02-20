// supabase/functions/telemetry/index.ts
/**
 * AI Usage Telemetry API — overview, model breakdown, errors, fallbacks, drift.
 * Reads from ai_events + embedding_stats for rich analytics.
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
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function parseRange(range: string): number {
  const match = range.match(/^(\d+)([dhm])$/);
  if (!match) return 7 * 24 * 60;
  const val = parseInt(match[1]);
  switch (match[2]) { case "d": return val * 24 * 60; case "h": return val * 60; case "m": return val; default: return 7 * 24 * 60; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "overview";
    const range = url.searchParams.get("range") || "7d";
    const windowMinutes = Math.min(90 * 24 * 60, parseRange(range));
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    switch (action) {
      case "overview": return await handleOverview(since, windowMinutes);
      case "models": return await handleModels(since);
      case "errors": return await handleErrors(since);
      case "fallbacks": return await handleFallbacks(since);
      case "drift": return await handleDrift(since);
      default: return jsonResponse({ error_code: "UNKNOWN_ACTION", message: "Use: overview, models, errors, fallbacks, drift" }, 400);
    }
  } catch (err) {
    console.error("telemetry error:", err);
    return jsonResponse({ error_code: "INTERNAL_ERROR", message: String(err) }, 500);
  }
});

async function handleOverview(since: string, windowMinutes: number) {
  // Fetch events and latest drift in parallel
  const [eventsRes, driftRes] = await Promise.all([
    supabase.from("ai_events").select("*").gte("timestamp", since).order("timestamp", { ascending: true }),
    supabase.from("embedding_stats").select("psi_score, recorded_at, model_id").order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (eventsRes.error) return jsonResponse({ error: eventsRes.error.message }, 500);

  const items = eventsRes.data || [];
  const totalRequests = items.length;
  const successCount = items.filter(e => (e.status_code || 200) < 400).length;
  const errorCount = items.filter(e => (e.status_code || 200) >= 400).length;
  const fallbackCount = items.filter(e => e.fallback).length;
  const latencies = items.filter(e => e.latency_ms != null).map(e => e.latency_ms!);
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

  // P95 latency
  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;

  const totalCost = items.reduce((sum, e) => sum + (Number(e.cost_estimate_usd) || 0), 0);
  const modelSet = new Set(items.filter(e => e.model_id).map(e => e.model_id));
  const modelCounts: Record<string, number> = {};
  items.forEach(e => { if (e.model_id) modelCounts[e.model_id] = (modelCounts[e.model_id] || 0) + 1; });
  const topModelEntry = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const activeConnection = items.some(e => e.timestamp >= fiveMinAgo);
  const lastUsed = items.length > 0 ? items[items.length - 1].timestamp : null;

  // Timeseries by day
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

  // Alerts
  const alerts: string[] = [];
  if (p95 > 2000) alerts.push("p95_latency_above_2s");
  if (totalRequests > 0 && errorCount / totalRequests > 0.01) alerts.push("error_rate_above_1pct");
  if (totalRequests > 0 && fallbackCount / totalRequests > 0.05) alerts.push("fallback_rate_above_5pct");
  if (driftRes.data && (driftRes.data.psi_score ?? 0) > 0.2) alerts.push("psi_drift_detected");

  return jsonResponse({
    active_connection: activeConnection,
    last_used: lastUsed,
    total_requests: totalRequests,
    success_count: successCount,
    error_count: errorCount,
    fallback_count: fallbackCount,
    avg_latency_ms: avgLatency,
    p95_latency_ms: p95,
    total_cost_usd: Math.round(totalCost * 1000000) / 1000000,
    number_of_models: modelSet.size,
    top_model: topModelEntry ? { model_id: topModelEntry[0], calls: topModelEntry[1] } : null,
    drift: driftRes.data ? { psi_score: driftRes.data.psi_score, recorded_at: driftRes.data.recorded_at, model_id: driftRes.data.model_id } : null,
    timeseries: timeseriesArray,
    alerts,
    window_minutes: windowMinutes,
    since,
    last_updated: new Date().toISOString(),
  });
}

async function handleModels(since: string) {
  const { data: events, error } = await supabase
    .from("ai_events")
    .select("model_id, model_provider, adapter_id, latency_ms, status_code, fallback, cost_estimate_usd, timestamp")
    .gte("timestamp", since)
    .not("model_id", "is", null);

  if (error) return jsonResponse({ error: error.message }, 500);

  const models: Record<string, {
    model_id: string; provider: string; calls: number; errors: number; fallbacks: number;
    totalLatency: number; latencyCount: number; totalCost: number; adapters: Set<string>; lastUsed: string;
  }> = {};

  (events || []).forEach(e => {
    const mid = e.model_id!;
    if (!models[mid]) {
      models[mid] = { model_id: mid, provider: e.model_provider || "unknown", calls: 0, errors: 0, fallbacks: 0,
        totalLatency: 0, latencyCount: 0, totalCost: 0, adapters: new Set(), lastUsed: e.timestamp };
    }
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
      adapters: [...m.adapters],
      last_used: m.lastUsed,
    })).sort((a, b) => b.calls - a.calls),
    since,
  });
}

async function handleErrors(since: string) {
  const { data, error } = await supabase
    .from("ai_events")
    .select("id, timestamp, model_id, error_code, status_code, fallback_reason, latency_ms, trace_id, input_hash")
    .gte("timestamp", since)
    .or("status_code.gte.400,error_code.not.is.null")
    .order("timestamp", { ascending: false })
    .limit(100);

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ errors: data || [], since });
}

async function handleFallbacks(since: string) {
  const { data, error } = await supabase
    .from("ai_events")
    .select("id, timestamp, model_id, fallback_reason, screening_id, latency_ms, trace_id, input_hash")
    .gte("timestamp", since)
    .eq("fallback", true)
    .order("timestamp", { ascending: false })
    .limit(100);

  if (error) return jsonResponse({ error: error.message }, 500);

  const reasonCounts: Record<string, number> = {};
  (data || []).forEach(e => { const r = e.fallback_reason || "unknown"; reasonCounts[r] = (reasonCounts[r] || 0) + 1; });

  return jsonResponse({ fallbacks: data || [], reason_summary: reasonCounts, since });
}

async function handleDrift(since: string) {
  const { data, error } = await supabase
    .from("embedding_stats")
    .select("psi_score, mean_norm, std_norm, n_samples, recorded_at, model_id, adapter_id, meta")
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: false })
    .limit(100);

  if (error) return jsonResponse({ error: error.message }, 500);

  const timeline = (data || []).map(d => ({
    ...d,
    alert: (d.psi_score ?? 0) > 0.2,
  }));

  return jsonResponse({
    drift_records: timeline,
    latest: timeline[0] || null,
    drift_detected: timeline.some(d => d.alert),
    since,
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
