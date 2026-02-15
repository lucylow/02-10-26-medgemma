// supabase/functions/get_screening/index.ts
/**
 * Get a single screening by ID with provenance metadata.
 * Logs invocation metrics.
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

async function recordMetric(handler: string, status: string, latencyMs: number, errorCode?: string) {
  try {
    await supabase.from("edge_metrics").insert({
      handler,
      status,
      latency_ms: Math.round(latencyMs),
      error_code: errorCode || null,
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

  try {
    const url = new URL(req.url);
    const screeningId = url.searchParams.get("id");

    if (!screeningId) {
      await recordMetric("get_screening", "error", performance.now() - start, "missing_id");
      return new Response(JSON.stringify({ error: "missing id query parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("screenings")
      .select("*")
      .eq("screening_id", screeningId)
      .single();

    if (error || !data) {
      await recordMetric("get_screening", "error", performance.now() - start, "not_found");
      return new Response(JSON.stringify({ error: error?.message || "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add provenance metadata
    const response = {
      ...data,
      provenance: {
        model_used: data.report?.model_used ?? false,
        model_parse_ok: data.report?.model_parse_ok ?? true,
        retrieved_at: new Date().toISOString(),
      },
    };

    await recordMetric("get_screening", "success", performance.now() - start);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get screening error:", err);
    await recordMetric("get_screening", "error", performance.now() - start, "internal");
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
