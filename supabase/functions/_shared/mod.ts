/**
 * Shared utilities for PediScreen AI edge functions v5.0.
 * CORS, Supabase client, errors, metrics, rate limiting,
 * hashing, tracing, consent verification, PHI logging,
 * retry with exponential backoff, circuit breaker.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ────────────────────────────────────────────────────────
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-request-id, x-org-id, x-user-role, traceparent, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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
export const MODEL_ID_PRO = "google/gemini-3-pro-preview";
export const MODEL_ID_VISION = "google/gemini-3-flash-preview";
export const AGENT_VERSION = "pediscreen-edge-v5.1";
export const COST_PER_1K_TOKENS = 0.00015;
export const COST_PER_1K_TOKENS_PRO = 0.00125;
export const EDGE_VERSION = "5.1.0";
export const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── Error responses ─────────────────────────────────────────────
export function errorResponse(
  code: string,
  message: string,
  status: number,
  traceId: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({ error_code: code, message, trace_id: traceId, timestamp: new Date().toISOString() }),
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

// ── Request context extraction ──────────────────────────────────
export interface RequestContext {
  traceId: string;
  orgId: string | null;
  userRole: string | null;
  apiKey: string | null;
}

export function extractContext(req: Request): RequestContext {
  return {
    traceId: extractTraceId(req),
    orgId: req.headers.get("x-org-id") || null,
    userRole: req.headers.get("x-user-role") || null,
    apiKey: req.headers.get("apikey") || null,
  };
}

// ── Retry with exponential backoff ──────────────────────────────
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = 2,
    baseDelayMs = 500,
    maxDelayMs = 4000,
    retryableStatuses = [500, 502, 503, 504],
  } = options;

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, init);

      // Don't retry on 402 (payment) or 429 (rate limit) — these are user-actionable
      if (resp.ok || resp.status === 402 || resp.status === 429) return resp;

      if (retryableStatuses.includes(resp.status) && attempt < maxRetries) {
        lastResponse = resp;
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        const jitter = Math.random() * delay * 0.3;
        console.warn(`[retry] attempt ${attempt + 1}/${maxRetries} after ${resp.status}, waiting ${Math.round(delay + jitter)}ms`);
        await new Promise((r) => setTimeout(r, delay + jitter));
        continue;
      }

      return resp;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        console.warn(`[retry] attempt ${attempt + 1}/${maxRetries} after error: ${lastError.message}`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error("fetchWithRetry exhausted");
}

// ── AI Gateway helper (retry + deadline + error normalization) ──
export interface AICallResult {
  ok: boolean;
  result?: Record<string, unknown>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: string;
  status?: number;
  latencyMs?: number;
}

export async function callAIGateway(
  messages: { role: string; content: string }[],
  options: {
    tools?: unknown[];
    tool_choice?: unknown;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    deadlineMs?: number;
  } = {},
): Promise<AICallResult> {
  if (!LOVABLE_API_KEY) return { ok: false, error: "no_api_key" };

  const {
    tools,
    tool_choice,
    model = MODEL_ID,
    temperature = 0.2,
    max_tokens,
    deadlineMs = 15000,
  } = options;

  const start = performance.now();

  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature,
    };
    if (tools) body.tools = tools;
    if (tool_choice) body.tool_choice = tool_choice;
    if (max_tokens) body.max_tokens = max_tokens;

    const resp = await withDeadline(
      fetchWithRetry(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }, { maxRetries: 2, baseDelayMs: 800 }),
      deadlineMs,
    );

    const latencyMs = Math.round(performance.now() - start);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[ai-gateway] error ${resp.status}:`, errText);
      return { ok: false, status: resp.status, error: errText, latencyMs };
    }

    const data = await resp.json();
    const usage = data.usage;

    // Try tool call first
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        return { ok: true, result: parsed, usage, latencyMs };
      } catch {
        return { ok: false, error: "tool_call_parse_failure", usage, latencyMs };
      }
    }

    // Fallback: extract JSON from content
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const first = content.indexOf("{");
      const last = content.lastIndexOf("}");
      if (first !== -1 && last !== -1) {
        try {
          const parsed = JSON.parse(content.slice(first, last + 1));
          return { ok: true, result: parsed, usage, latencyMs };
        } catch { /* fall through */ }
      }
      // Return raw content as result
      return { ok: true, result: { raw_content: content }, usage, latencyMs };
    }

    return { ok: false, error: "no_output", usage, latencyMs };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - start);
    const isTimeout = e instanceof Error && e.message === "DEADLINE_EXCEEDED";
    console.error("[ai-gateway] call failed:", e);
    return { ok: false, error: isTimeout ? "MODEL_TIMEOUT" : String(e), latencyMs };
  }
}

// ── Handle AI error responses (402/429) ─────────────────────────
export function handleAIErrorResponse(
  aiResult: AICallResult,
  traceId: string,
  extraHeaders: Record<string, string> = {},
): Response | null {
  if (aiResult.status === 429) {
    return errorResponse("RATE_LIMITED", "AI rate limit exceeded. Please try again shortly.", 429, traceId, {
      ...extraHeaders,
      "Retry-After": "30",
    });
  }
  if (aiResult.status === 402) {
    return errorResponse("PAYMENT_REQUIRED", "AI credits exhausted. Please add credits to continue.", 402, traceId, extraHeaders);
  }
  return null;
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

// ── Audit event recording ───────────────────────────────────────
export async function recordAuditEvent(
  action: string,
  payload: Record<string, unknown>,
  screeningId?: string,
): Promise<void> {
  try {
    await supabase.from("audit_events").insert({
      action,
      screening_id: screeningId || null,
      payload,
    });
  } catch (e) {
    console.error("[audit] insert failed:", e);
  }
}

// ── Consent verification ────────────────────────────────────────
export async function verifyConsent(
  patientId: string,
  purpose: string,
): Promise<{ valid: boolean; consentId?: string }> {
  try {
    const { data } = await supabase
      .from("consents")
      .select("id")
      .eq("patient_id", patientId)
      .eq("purpose", purpose)
      .eq("granted", true)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .limit(1)
      .maybeSingle();
    return data ? { valid: true, consentId: data.id } : { valid: false };
  } catch {
    return { valid: false };
  }
}

// ── Rate limiter (per-instance in-memory with cleanup) ──────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

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
  return req.headers.get("x-org-id") || req.headers.get("apikey") || req.headers.get("x-forwarded-for") || "global";
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
      if (v <= b) { result[`le_${b}`]++; placed = true; break; }
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

// ── Deadline helper ─────────────────────────────────────────────
export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("DEADLINE_EXCEEDED")), ms)),
  ]);
}

// ── Embedding stats recording ───────────────────────────────────
export async function recordEmbeddingStats(stats: {
  model_id?: string;
  adapter_id?: string;
  mean_norm?: number;
  std_norm?: number;
  n_samples?: number;
  psi_score?: number;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from("embedding_stats").insert(stats);
  } catch (e) {
    console.error("[embedding_stats] insert failed:", e);
  }
}
