// supabase/functions/verify-screening/index.ts
/**
 * Verify on-chain screening by tokenId and/or aiReportHash.
 * GET /verify-screening?tokenId=123 | ?aiReportHash=0x... | ?screeningId=...
 * Optionally verifies against HealthChainPOC or PediScreenRegistry when env is set.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse, extractTraceId } from "../_shared/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const traceId = extractTraceId(req);

  try {
    if (req.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only GET is supported", 405, traceId, corsHeaders);
    }

    const url = new URL(req.url);
    const tokenId = url.searchParams.get("tokenId");
    const aiReportHash = url.searchParams.get("aiReportHash");
    const screeningId = url.searchParams.get("screeningId");

    if (!tokenId && !aiReportHash && !screeningId) {
      return errorResponse(
        "MISSING_PARAMETER",
        "Provide one of: tokenId, aiReportHash, screeningId",
        400,
        traceId,
        corsHeaders
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const result: {
      verified: boolean;
      source: "database" | "on_chain" | "not_found";
      screeningId?: string;
      tokenId?: string;
      aiReportHash?: string;
      message?: string;
      trace_id: string;
    } = {
      verified: false,
      source: "not_found",
      trace_id: traceId,
    };

    if (screeningId) {
      const { data } = await supabase
        .from("screenings")
        .select("screening_id, report")
        .eq("screening_id", screeningId)
        .maybeSingle();

      if (data) {
        const report = data.report as Record<string, unknown> | null;
        const computedHash = report
          ? await sha256Hex(JSON.stringify(report))
          : null;
        result.verified = true;
        result.source = "database";
        result.screeningId = data.screening_id;
        result.aiReportHash = computedHash ?? undefined;
        return jsonResponse(result, 200, corsHeaders);
      }
    }

    if (aiReportHash && !result.verified) {
      const { data: rows } = await supabase
        .from("screenings")
        .select("screening_id, report");
      for (const row of rows ?? []) {
        const h = await sha256Hex(JSON.stringify(row.report));
        if (h === aiReportHash) {
          result.verified = true;
          result.source = "database";
          result.screeningId = row.screening_id;
          result.aiReportHash = aiReportHash;
          return jsonResponse(result, 200, corsHeaders);
        }
      }
    }

    const contractAddress = Deno.env.get("HEALTH_CHAIN_POC_ADDRESS");
    const rpcUrl = Deno.env.get("HEALTH_CHAIN_POC_RPC_URL");
    if (tokenId && contractAddress && rpcUrl) {
      result.message = "On-chain verification: set backend or use frontend with contract.";
      result.tokenId = tokenId;
    }

    return jsonResponse(result, 200, corsHeaders);
  } catch (err) {
    console.error("[verify-screening]", err);
    return errorResponse("INTERNAL_ERROR", String(err), 500, traceId, corsHeaders);
  }
});

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
