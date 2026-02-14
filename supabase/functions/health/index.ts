// supabase/functions/health/index.ts
/**
 * Health check endpoint for Lovable/Supabase Edge.
 * GET /health -> { healthy: true, timestamp, version }
 */
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = {
    healthy: true,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    service: "pediscreen-edge",
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
