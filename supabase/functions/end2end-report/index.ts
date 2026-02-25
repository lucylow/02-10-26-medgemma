/**
 * End-to-End Report Edge Function
 * Generates clinical draft, allows patch, and finalizes with PDF-ready output.
 * Uses Lovable AI (Gemini) for report generation.
 */
import {
  corsHeaders,
  corsResponse,
  jsonResponse,
  errorResponse,
  extractTraceId,
  callAIGateway,
  handleAIErrorResponse,
  recordMetric,
  recordAuditEvent,
  MODEL_ID_PRO,
  AGENT_VERSION,
  supabase,
} from "../_shared/mod.ts";

// In-memory store for demo reports (edge function instance lifetime)
const reportStore = new Map<string, {
  report_id: string;
  screening_id: string;
  status: "draft" | "finalized";
  clinical_summary: string;
  technical_summary: string;
  parent_summary: string;
  recommendations: string[];
  domains: { domain: string; rating: string; rationale: string }[];
  evidence: { id: string; type: string; summary: string }[];
  icd_codes: string[];
  clinician_approval?: { note: string; signed_at: string };
  created_at: string;
}>();

const REPORT_TOOL = {
  type: "function",
  function: {
    name: "generate_clinical_report",
    description: "Generate a structured pediatric developmental screening report",
    parameters: {
      type: "object",
      properties: {
        clinical_summary: { type: "string", description: "Clinical summary for clinician review (2-4 sentences)" },
        technical_summary: { type: "string", description: "Technical details including scoring methodology" },
        parent_summary: { type: "string", description: "Parent-friendly explanation of findings" },
        risk_level: { type: "string", enum: ["low", "moderate", "high"] },
        recommendations: { type: "array", items: { type: "string" }, description: "Clinical recommendations" },
        domains: {
          type: "array",
          items: {
            type: "object",
            properties: {
              domain: { type: "string" },
              rating: { type: "string", enum: ["on_track", "monitor", "refer"] },
              rationale: { type: "string" },
            },
            required: ["domain", "rating", "rationale"],
          },
        },
        icd_codes: { type: "array", items: { type: "string" }, description: "Relevant ICD-10 codes" },
        key_findings: { type: "array", items: { type: "string" } },
      },
      required: ["clinical_summary", "technical_summary", "parent_summary", "risk_level", "recommendations", "domains", "icd_codes"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const traceId = extractTraceId(req);
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/end2end-report\/?/, "/");
  const start = performance.now();

  try {
    // POST / — Generate draft
    if (req.method === "POST" && (path === "/" || path === "")) {
      const formData = await req.formData();
      const screeningId = formData.get("screening_id") as string || `e2e-${Date.now()}`;
      const ageMonths = parseInt(formData.get("age_months") as string || "24");
      const scoresJson = formData.get("scores_json") as string || "{}";
      const observations = formData.get("observations") as string || "";

      let scores: Record<string, number> = {};
      try { scores = JSON.parse(scoresJson); } catch { /* ignore */ }

      const domainList = Object.keys(scores).join(", ") || "general development";

      const systemPrompt = `You are a board-certified developmental pediatrician generating a clinical screening report. 
Be specific, evidence-based, and actionable. Use AAP guidelines.
The child is ${ageMonths} months old. Domains assessed: ${domainList}.
Scores: ${JSON.stringify(scores)}`;

      const aiResult = await callAIGateway(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Observations: ${observations}\n\nGenerate a complete developmental screening report.` },
        ],
        {
          tools: [REPORT_TOOL],
          tool_choice: { type: "function", function: { name: "generate_clinical_report" } },
          model: MODEL_ID_PRO,
          temperature: 0.3,
          deadlineMs: 30000,
        },
      );

      const aiError = handleAIErrorResponse(aiResult, traceId);
      if (aiError) return aiError;

      if (!aiResult.ok || !aiResult.result) {
        // Fallback mock
        const report = buildMockReport(screeningId, ageMonths, observations, scores);
        reportStore.set(report.report_id, report);
        await recordMetric("end2end-report", "fallback", Math.round(performance.now() - start));
        return jsonResponse({ ...report, _fallback: true });
      }

      const r = aiResult.result;
      const reportId = `rpt-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const report = {
        report_id: reportId,
        screening_id: screeningId,
        status: "draft" as const,
        clinical_summary: (r.clinical_summary as string) || "",
        technical_summary: (r.technical_summary as string) || "",
        parent_summary: (r.parent_summary as string) || "",
        recommendations: (r.recommendations as string[]) || [],
        domains: (r.domains as { domain: string; rating: string; rationale: string }[]) || [],
        evidence: (r.key_findings as string[] || []).map((f: string, i: number) => ({
          id: `ev-${i}`, type: "observation", summary: f,
        })),
        icd_codes: (r.icd_codes as string[]) || [],
        created_at: new Date().toISOString(),
      };

      reportStore.set(reportId, report);

      await recordAuditEvent("e2e_draft_generated", {
        report_id: reportId,
        screening_id: screeningId,
        model_used: true,
        latency_ms: aiResult.latencyMs,
      }, screeningId);

      await recordMetric("end2end-report", "ok", Math.round(performance.now() - start));

      return jsonResponse(report);
    }

    // POST /reports/:id/patch
    const patchMatch = path.match(/^\/reports\/([^/]+)\/patch$/);
    if (req.method === "POST" && patchMatch) {
      const reportId = patchMatch[1];
      const report = reportStore.get(reportId);
      if (!report) return errorResponse("NOT_FOUND", "Report not found", 404, traceId);
      if (report.status === "finalized") {
        return errorResponse("BAD_REQUEST", "Cannot patch a finalized report", 400, traceId);
      }

      const patch = await req.json();
      if (patch.clinical_summary) report.clinical_summary = patch.clinical_summary;
      if (patch.technical_summary) report.technical_summary = patch.technical_summary;
      if (patch.parent_summary) report.parent_summary = patch.parent_summary;
      if (patch.recommendations) report.recommendations = patch.recommendations;

      reportStore.set(reportId, report);

      await recordAuditEvent("e2e_draft_patched", { report_id: reportId }, report.screening_id);

      return jsonResponse({ ok: true, updated_draft: report });
    }

    // POST /reports/:id/approve
    const approveMatch = path.match(/^\/reports\/([^/]+)\/approve$/);
    if (req.method === "POST" && approveMatch) {
      const reportId = approveMatch[1];
      const report = reportStore.get(reportId);
      if (!report) return errorResponse("NOT_FOUND", "Report not found", 404, traceId);

      let clinicianNote = "";
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("json")) {
        const body = await req.json();
        clinicianNote = body.clinician_note || "";
      } else {
        const fd = await req.formData().catch(() => null);
        if (fd) clinicianNote = (fd.get("clinician_note") as string) || "";
      }

      report.status = "finalized";
      report.clinician_approval = {
        note: clinicianNote,
        signed_at: new Date().toISOString(),
      };
      reportStore.set(reportId, report);

      // Generate a simple text-based "PDF" placeholder (base64)
      const pdfContent = buildPdfPlaceholder(report);
      const pdfBase64 = btoa(pdfContent);

      await recordAuditEvent("e2e_report_finalized", {
        report_id: reportId,
        clinician_note: clinicianNote,
      }, report.screening_id);

      return jsonResponse({
        ok: true,
        final: report,
        pdf_base64: pdfBase64,
      });
    }

    return errorResponse("NOT_FOUND", "Unknown endpoint", 404, traceId);
  } catch (e) {
    console.error("[end2end-report] error:", e);
    await recordMetric("end2end-report", "error", Math.round(performance.now() - start), String(e));
    return errorResponse("INTERNAL", String(e), 500, traceId);
  }
});

function buildMockReport(screeningId: string, age: number, obs: string, scores: Record<string, number>) {
  const reportId = `rpt-mock-${Date.now()}`;
  return {
    report_id: reportId,
    screening_id: screeningId,
    status: "draft" as const,
    clinical_summary: `${age}-month-old presenting with developmental concerns based on caregiver observations. ${obs}`,
    technical_summary: `Screening scores: ${JSON.stringify(scores)}. Evaluated using PediScreen v5.1 mock fallback.`,
    parent_summary: "Based on what you shared, we noticed some areas where your child may benefit from extra support.",
    recommendations: [
      "Refer to Early Intervention for comprehensive evaluation.",
      "Schedule follow-up with pediatrician within 30 days.",
      "Continue routine developmental surveillance.",
    ],
    domains: Object.entries(scores).map(([d, s]) => ({
      domain: d,
      rating: s < 0.4 ? "refer" : s < 0.7 ? "monitor" : "on_track",
      rationale: `Score ${s} for ${d}`,
    })),
    evidence: [{ id: "ev-0", type: "observation", summary: obs }],
    icd_codes: ["R62.0"],
    created_at: new Date().toISOString(),
  };
}

function buildPdfPlaceholder(report: typeof reportStore extends Map<string, infer V> ? V : never): string {
  // Simple text file as a placeholder (not a real PDF, but base64 decodable)
  return [
    "=== PediScreen Clinical Report ===",
    `Report ID: ${report.report_id}`,
    `Screening: ${report.screening_id}`,
    `Status: ${report.status}`,
    `Generated: ${report.created_at}`,
    "",
    "--- Clinical Summary ---",
    report.clinical_summary,
    "",
    "--- Recommendations ---",
    ...report.recommendations.map((r, i) => `${i + 1}. ${r}`),
    "",
    "--- Domains ---",
    ...report.domains.map(d => `${d.domain}: ${d.rating} — ${d.rationale}`),
    "",
    report.clinician_approval
      ? `Signed by clinician at ${report.clinician_approval.signed_at}: ${report.clinician_approval.note}`
      : "",
  ].join("\n");
}
