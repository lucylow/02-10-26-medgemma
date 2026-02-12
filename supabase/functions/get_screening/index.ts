// supabase/functions/get_screening/index.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const screeningId = url.searchParams.get("id");
    if (!screeningId) {
      return new Response(JSON.stringify({ error: "missing id query parameter" }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    const { data, error } = await supabase.from("screenings").select("*").eq("screening_id", screeningId).single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 404, headers: { "Content-Type": "application/json" }});
    }
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("get screening error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
