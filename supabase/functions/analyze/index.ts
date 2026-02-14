// supabase/functions/analyze/index.ts
/**
 * Supabase Edge Function (Deno + Supabase JS via CDN)
 * POST / -> accepts multipart/form-data: childAge, domain, observations, optional image
 *
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - (optional) HF_MODEL, HF_API_KEY for model-assisted analysis
 */

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { analyzeWithModel } from "./analyzer.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Accept multipart form
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "content_type_must_be_multipart/form-data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const childAgeRaw = form.get("childAge")?.toString() ?? "";
    const domain = form.get("domain")?.toString() ?? "";
    const observations = form.get("observations")?.toString() ?? "";

    const childAge = parseInt(childAgeRaw, 10);
    if (isNaN(childAge)) {
      return new Response(JSON.stringify({ error: "childAge must be integer months" }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    // optional file
    const file = form.get("image") as File | null;
    const screeningId = `ps-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;

    let imagePath: string | null = null;
    let fileBytes: Uint8Array | null = null;

    if (file && file.size > 0) {
      // generate storage path
      const filename = file.name ?? "upload.jpg";
      const storagePath = `${screeningId}/${filename}`;

      // convert file to Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      fileBytes = new Uint8Array(arrayBuffer);

      // Upload to Supabase Storage (bucket: uploads)
      const { error: upErr } = await supabase.storage.from("uploads").upload(storagePath, fileBytes!, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });

      if (upErr) {
        console.error("storage upload error:", upErr);
        return new Response(JSON.stringify({ error: "storage_upload_failed", detail: upErr.message }), { status: 500, headers: { "Content-Type": "application/json" }});
      }
      imagePath = storagePath;
    }

    // Run analysis (deterministic baseline + optional model when HF_MODEL/HF_API_KEY set)
    const analysisResult = await analyzeWithModel({
      childAgeMonths: childAge,
      domain,
      observations,
      imageProvided: !!imagePath,
      imageBytes: fileBytes ?? null,
      imageFilename: file && file.size > 0 ? (file.name ?? "upload.jpg") : null,
    });

    const report = analysisResult.report;

    // persist to Postgres (include model provenance for audit)
    const insertRow = {
      screening_id: screeningId,
      child_age_months: childAge,
      domain,
      observations,
      image_path: imagePath,
      report: { ...report, model_used: analysisResult.usedModel, model_parse_ok: analysisResult.parseOk },
    };

    const { data, error: dbErr } = await supabase.from("screenings").insert([insertRow]).select().single();
    if (dbErr) {
      console.error("db insert error:", dbErr);
      // Attempt to remove uploaded file if DB failed (best-effort)
      if (imagePath) {
        await supabase.storage.from("uploads").remove([imagePath]);
      }
      return new Response(JSON.stringify({ error: "db_insert_failed", detail: dbErr.message }), { status: 500, headers: { "Content-Type": "application/json" }});
    }

    // Return the structured response expected by frontend (include model provenance)
    const responsePayload = {
      success: true,
      screening_id: screeningId,
      report,
      timestamp: Date.now(),
      model_used: analysisResult.usedModel,
      model_parse_ok: analysisResult.parseOk,
    };

    return new Response(JSON.stringify(responsePayload), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("function error:", err);
    return new Response(JSON.stringify({ error: "internal_error", detail: String(err) }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
