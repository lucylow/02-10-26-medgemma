/**
 * Shared utilities for all PediScreen AI edge functions.
 * Provides: CORS, Supabase client, error responses, metrics recording,
 * rate limiting, input hashing, and tracing.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ────────────────────────────────────────────────────────
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function corsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

// ── Supabase Client (singleton) ─────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Constants ───────────────────────────────────────────────────
export const MODEL_ID = "google/gemini-3-flash-preview";
export const AGENT_VERSION = "medgemma-service-v0.6";
export const COST_PER_1K_TOKENS = 0.00015;
export const EDGE_VERSION = "3.0.0";

// ── Error responses ─────────────────────────────────────────────
export function errorResponse(
  code: string,
  message: string,
  status: number,
  traceId: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({ error_code: code, message, trace_id: traceId }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json", ...extra } },
  );
}

export function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

// ── Tracing ─────────────────────────────────────────────────────
export function extractTraceId(req: Request): string {
  return req.headers.get("x-request-id") || req.headers.get("traceparent")?.split("-")[1] || crypto.randomUUID();
}

// ── Metrics recording ───────────────────────────────────────────
export async function recordMetric(
  handler: string,
  status: string,
  latencyMs: number,
  errorCode?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("edge_metrics").insert({
      handler,
      status,
      latency_ms: Math.round(latencyMs),
      error_code: errorCode || null,
      metadata: metadata || null,
    });
  } catch (e) {
    console.error("[metrics] insert failed:", e);
  }
}

export async function recordAIEvent(event: Record<string, unknown>): Promise<void> {
  try {
    await supabase.from("ai_events").insert(event);
  } catch (e) {
    console.error("[ai_event] insert failed:", e);
  }
}

// ── Rate limiter (per-instance in-memory) ───────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export function checkRateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  let entry = rateLimitMap.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitMap.set(key, entry);
  }
  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining, resetAt: entry.resetAt, limit: maxRequests };
}

export function rateLimitHeaders(rl: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": new Date(rl.resetAt).toISOString(),
  };
}

export function rateLimitKey(req: Request): string {
  return req.headers.get("apikey") || req.headers.get("x-forwarded-for") || "global";
}

// ── Input hashing ───────────────────────────────────────────────
export async function hashInput(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Latency histogram ───────────────────────────────────────────
export const LATENCY_BUCKETS = [50, 100, 200, 500, 1000, 2000, 5000];

export function bucketize(latencies: number[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const b of LATENCY_BUCKETS) result[`le_${b}`] = 0;
  result["le_inf"] = 0;
  for (const v of latencies) {
    let placed = false;
    for (const b of LATENCY_BUCKETS) {
      if (v <= b) {
        result[`le_${b}`]++;
        placed = true;
        break;
      }
    }
    if (!placed) result["le_inf"]++;
  }
  return result;
}

// ── Time range parser ───────────────────────────────────────────
export function parseRange(range: string): number {
  const match = range.match(/^(\d+)([dhm])$/);
  if (!match) return 7 * 24 * 60;
  const val = parseInt(match[1]);
  switch (match[2]) {
    case "d": return val * 24 * 60;
    case "h": return val * 60;
    case "m": return val;
    default: return 7 * 24 * 60;
  }
}
