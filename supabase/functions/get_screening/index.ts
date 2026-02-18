// supabase/functions/get_screening/index.ts
/**
 * Get a single screening by ID with provenance metadata and audit trail.
 * Supports trace propagation and standardized error responses.
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

function errorResponse(code: string, message: string, status: number, traceId: string) {
  return new Response(
    JSON.stringify({ error_code: code, message, trace_id: traceId }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function recordMetric(handler: string, status: string, latencyMs: number, errorCode?: string) {
  try {
    await supabase.from("edge_metrics").insert({
      handler, status, latency_ms: Math.round(latencyMs), error_code: errorCode || null,
    });
  } catch (e) {
    console.error("metric insert failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = performance.now();
  const traceId = req.headers.get("x-request-id") || crypto.randomUUID();

  try {
    const url = new URL(req.url);
    const screeningId = url.searchParams.get("id");

    if (!screeningId) {
      await recordMetric("get_screening", "error", performance.now() - start, "missing_id");
      return errorResponse("MISSING_PARAMETER", "Query parameter 'id' is required", 400, traceId);
    }

    // Fetch screening
    const { data, error } = await supabase
      .from("screenings")
      .select("*")
      .eq("screening_id", screeningId)
      .single();

    if (error || !data) {
      await recordMetric("get_screening", "error", performance.now() - start, "not_found");
      return errorResponse("NOT_FOUND", `Screening '${screeningId}' not found`, 404, traceId);
    }

    // Fetch audit trail for this screening
    const { data: auditEvents } = await supabase
      .from("audit_events")
      .select("action, created_at, model_id, adapter_id, is_mock")
      .eq("screening_id", screeningId)
      .order("created_at", { ascending: true })
      .limit(50);

    const response = {
      ...data,
      provenance: {
        model_id: data.model_id,
        adapter_id: data.adapter_id,
        model_used: data.report?.model_used ?? false,
        is_mock: data.is_mock,
        input_hash: data.input_hash,
        prompt_hash: data.prompt_hash,
        retrieved_at: new Date().toISOString(),
      },
      audit_trail: (auditEvents || []).map(e => ({
        action: e.action,
        timestamp: e.created_at,
        model_id: e.model_id,
        is_mock: e.is_mock,
      })),
      trace_id: traceId,
    };

    await recordMetric("get_screening", "success", performance.now() - start);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get screening error:", err);
    await recordMetric("get_screening", "error", performance.now() - start, "internal");
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId);
  }
});
