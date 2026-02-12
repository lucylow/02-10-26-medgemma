// supabase/functions/list_screenings/index.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

    // simple pagination via query params
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const page = Number(url.searchParams.get("page") || "0");
    const offset = page * limit;

    const { data, error } = await supabase.from("screenings")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" }});
    }

    return new Response(JSON.stringify({ items: data }), { headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("list error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
