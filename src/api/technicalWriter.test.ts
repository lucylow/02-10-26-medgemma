/**
 * Unit/integration tests for MedGemma Detailed Writer API (technicalWriter.ts).
 * Uses mocked fetch responses from mock_data.json equivalents.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateDraftEnd2End,
  patchReportEnd2End,
  finalizeReportEnd2End,
  fetchReportEnd2End,
} from "./technicalWriter";
import { createMockFetch } from "@/test/mocks/medgemmaHandlers";

describe("technicalWriter (MedGemma end2end API)", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("generateDraftEnd2End", () => {
    it("returns draft report with expected structure", async () => {
      const formData = new FormData();
      formData.set("screening_id", "screen-0001");
      formData.set("age_months", "24");
      formData.set("scores_json", JSON.stringify({ communication: 0.3, motor: 0.85 }));
      formData.set("observations", "Parent reports few words.");

      const result = await generateDraftEnd2End(formData);

      expect(result).toBeDefined();
      expect(result.report_id).toBe("trpt-1700000000-abc12345");
      expect(result.status).toBe("draft");
      expect(result.clinical_summary).toContain("delayed expressive language");
      expect(result.risk_assessment_overall).toBe("medium");
      expect(result.recommendations).toHaveLength(3);
      expect(result.domains).toBeDefined();
      expect(result.evidence).toHaveLength(2);
    });

    it("sends FormData to generate-end2end endpoint", async () => {
      const formData = new FormData();
      formData.set("screening_id", "screen-0001");
      formData.set("age_months", "24");
      formData.set("scores_json", "{}");
      formData.set("observations", "test");

      await generateDraftEnd2End(formData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/medgemma/generate-end2end"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-api-key": expect.any(String) }),
          body: formData,
        })
      );
    });
  });

  describe("patchReportEnd2End", () => {
    it("returns ok and updated_draft with clinician edits", async () => {
      const patch = {
        clinical_summary: "Edited by clinician: I agree that communication should be monitored.",
        recommendations: [
          "Refer to speech-language pathologist for assessment",
          "Connect family to local early intervention services",
        ],
      };

      const result = await patchReportEnd2End("trpt-1700000000-abc12345", patch);

      expect(result.ok).toBe(true);
      expect(result.updated_draft).toBeDefined();
      expect(result.updated_draft!.clinical_summary).toContain("Edited by clinician");
      expect(result.updated_draft!.recommendations).toContain(
        "Connect family to local early intervention services"
      );
    });

    it("sends JSON patch to patch endpoint", async () => {
      await patchReportEnd2End("trpt-123", { clinical_summary: "Edited" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/medgemma/reports/trpt-123/patch"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({ clinical_summary: "Edited" }),
        })
      );
    });
  });

  describe("finalizeReportEnd2End", () => {
    it("returns ok, final, and pdf_base64", async () => {
      const result = await finalizeReportEnd2End(
        "trpt-1700000000-abc12345",
        "Reviewed and signed. SLP referral placed."
      );

      expect(result.ok).toBe(true);
      expect(result.final).toBeDefined();
      expect(result.final!.status).toBe("finalized");
      expect((result.final as any).clinician_approval).toBeDefined();
      expect((result.final as any).clinician_approval!.note).toContain("SLP referral placed");
      expect(result.pdf_base64).toBeDefined();
      expect(typeof result.pdf_base64).toBe("string");
    });

    it("sends clinician_note as form data", async () => {
      const note = "Reviewed and signed.";
      await finalizeReportEnd2End("trpt-123", note);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/medgemma/reports/trpt-123/approve"),
        expect.objectContaining({
          method: "POST",
          body: expect.any(URLSearchParams),
        })
      );
      const body = (mockFetch.mock.calls[0][1] as { body: URLSearchParams }).body as URLSearchParams;
      expect(body.get("clinician_note")).toBe(note);
    });
  });

  describe("fetchReportEnd2End", () => {
    it("returns report with draft_json", async () => {
      const result = await fetchReportEnd2End("trpt-1700000000-abc12345");

      expect(result.report_id).toBe("trpt-1700000000-abc12345");
      expect(result.status).toBe("draft");
      expect(result.draft_json).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("throws on generate failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ detail: "Internal server error" }),
        })
      );

      const formData = new FormData();
      formData.set("screening_id", "x");
      formData.set("age_months", "24");
      formData.set("scores_json", "{}");
      formData.set("observations", "x");

      await expect(generateDraftEnd2End(formData)).rejects.toThrow();
    });

    it("throws on patch failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ detail: "report not found" }),
        })
      );

      await expect(patchReportEnd2End("bad-id", { clinical_summary: "x" })).rejects.toThrow();
    });
  });
});
