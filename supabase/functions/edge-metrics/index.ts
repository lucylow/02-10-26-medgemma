// supabase/functions/edge-metrics/index.ts
/**
 * Raspberry Pi 5 Edge AI metrics.
 *
 * - POST /edge-metrics: ingest telemetry from Pi devices
 * - GET  /edge-metrics: list latest metrics per device for dashboards
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsResponse,
  supabase,
  errorResponse,
  jsonResponse,
  extractContext,
  recordMetric,
  checkRateLimit,
  rateLimitHeaders,
  rateLimitKey,
} from "../_shared/mod.ts";

type EdgeMetricPayload = {
  device_id?: string;
  deviceId?: string;
  cpu?: number;
  memory?: number;
  model_loaded?: string;
  inference_time_ms?: number;
  queue_length?: number;
  uptime?: string;
  last_screening?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const start = performance.now();
  const ctx = extractContext(req);
  const rl = checkRateLimit(rateLimitKey(req), 120);
  const rlH = rateLimitHeaders(rl);

  if (!rl.allowed) {
    recordMetric("edge-metrics", "rate_limited", 0, "RATE_LIMITED").catch(() => {});
    return errorResponse("RATE_LIMITED", "Too many requests", 429, ctx.traceId, {
      ...rlH,
      "Retry-After": "60",
    });
  }

  try {
    if (req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as EdgeMetricPayload;
      const deviceId = body.device_id || body.deviceId;
      if (!deviceId) {
        return errorResponse("MISSING_DEVICE_ID", "device_id is required", 400, ctx.traceId, rlH);
      }

      const cpu = typeof body.cpu === "number" ? body.cpu : null;
      const memory = typeof body.memory === "number" ? body.memory : null;
      const inferenceMs =
        typeof body.inference_time_ms === "number" ? Math.round(body.inference_time_ms) : null;
      const queueLength =
        typeof body.queue_length === "number" ? Math.round(body.queue_length) : null;

      const { error } = await supabase
        .from("edge_pi_metrics")
        .upsert(
          {
            device_id: deviceId,
            model_loaded: body.model_loaded ?? null,
            cpu,
            memory,
            inference_time_ms: inferenceMs,
            queue_length: queueLength,
            uptime: body.uptime ?? null,
            last_screening: body.last_screening ?? null,
            last_heartbeat_at: new Date().toISOString(),
          },
          { onConflict: "device_id" },
        );

      if (error) {
        recordMetric("edge-metrics", "error", 0, "UPSERT_FAILED", { device_id: deviceId }).catch(
          () => {},
        );
        return errorResponse("UPSERT_FAILED", error.message, 500, ctx.traceId, rlH);
      }

      const latency = Math.round(performance.now() - start);
      recordMetric("edge-metrics", "success", latency, undefined, {
        device_id: deviceId,
      }).catch(() => {});

      return jsonResponse({ ok: true, device_id: deviceId, trace_id: ctx.traceId }, 200, rlH);
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const windowMinutes = Math.min(60, Number(url.searchParams.get("window") || "10"));
      const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("edge_pi_metrics")
        .select(
          "device_id, model_loaded, cpu, memory, inference_time_ms, queue_length, uptime, last_screening, last_heartbeat_at",
        )
        .gte("last_heartbeat_at", since)
        .order("last_heartbeat_at", { ascending: false });

      if (error) {
        recordMetric("edge-metrics", "error", 0, "QUERY_FAILED").catch(() => {});
        return errorResponse("QUERY_FAILED", error.message, 500, ctx.traceId, rlH);
      }

      const devices = (data || []).map((row) => ({
        device_id: row.device_id as string,
        model_loaded: (row.model_loaded as string | null) ?? "",
        cpu: typeof row.cpu === "number" ? row.cpu : 0,
        memory: typeof row.memory === "number" ? row.memory : 0,
        inference_time_ms:
          typeof row.inference_time_ms === "number" ? row.inference_time_ms : 0,
        queue_length: typeof row.queue_length === "number" ? row.queue_length : 0,
        uptime: (row.uptime as string | null) ?? "",
        last_screening: (row.last_screening as string | null) ?? "",
        last_heartbeat_at: row.last_heartbeat_at as string | null,
      }));

      const latency = Math.round(performance.now() - start);
      recordMetric("edge-metrics", "success", latency, undefined, {
        devices: devices.length,
      }).catch(() => {});

      return jsonResponse(
        {
          devices,
          window_minutes: windowMinutes,
          trace_id: ctx.traceId,
          last_updated: new Date().toISOString(),
        },
        200,
        rlH,
      );
    }

    return errorResponse("METHOD_NOT_ALLOWED", "Use GET or POST", 405, ctx.traceId, rlH);
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    recordMetric("edge-metrics", "error", latency, "UNHANDLED_ERROR").catch(() => {});
    return errorResponse("UNHANDLED_ERROR", String(err), 500, ctx.traceId, rlH);
  }
});

