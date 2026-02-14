/**
 * Mock API responses for MedGemma Detailed Writer end-to-end flow.
 * Use with vi.stubGlobal('fetch', ...) in Vitest tests.
 *
 * Matches backend/tests/mock_data.json frontend_mock_* responses.
 */

export const mockGenerateResponse = {
  report_id: "trpt-1700000000-abc12345",
  status: "draft",
  clinical_summary:
    "This 24-month-old child shows signs consistent with delayed expressive language. Parent reports indicate approximately 10 single words without phrase formation.",
  technical_summary:
    "Communication domain score 0.30 (below expected). Motor, social and cognitive domains appear within typical ranges.",
  parent_summary: "Your child uses about 10 single words and is not yet combining words.",
  risk_assessment_overall: "medium",
  domains: [
    { domain: "communication", rating: "monitor", rationale: "ASQ-3 Communication score below cutoff" },
    { domain: "motor", rating: "typical", rationale: "Motor score within expected range" },
  ],
  evidence: [
    { id: "ev1", type: "score", summary: "ASQ-3 Communication: 0.30", confidence: 0.95 },
    { id: "ev2", type: "text", summary: "Parent report: ~10 single words", confidence: 0.9 },
  ],
  recommendations: [
    "Refer to speech-language pathologist for assessment",
    "Start daily shared reading and language-stimulation activities",
    "Re-screen communication domain in 2 months",
  ],
  citations: [{ id: "c1", text: "ASQ-3 User's Guide", url: "https://example.org/asq3" }],
};

export const mockPatchResponse = {
  ok: true,
  updated_draft: {
    ...mockGenerateResponse,
    clinical_summary:
      "Edited by clinician: I agree that communication should be monitored. Family advised for immediate speech-language referral.",
    recommendations: [
      "Refer to speech-language pathologist for assessment",
      "Connect family to local early intervention services",
      "Start daily shared reading and language-stimulation activities",
      "Re-screen communication domain in 2 months",
    ],
  },
};

export const mockFinalizeResponse = {
  ok: true,
  final: {
    report_id: "trpt-1700000000-abc12345",
    status: "finalized",
    clinician_approval: { by: "clinician_jane", note: "Reviewed and signed. SLP referral placed.", at: 1700000100 },
  },
  pdf_base64: "JVBERi0xLjQKJeLjz9MK...",
};

/** Creates a mock fetch that returns these responses based on URL. */
export function createMockFetch() {
  return vi.fn().mockImplementation((url: string | URL, options?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (urlStr.includes("generate-end2end")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGenerateResponse),
      } as Response);
    }
    if (urlStr.includes("/patch")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPatchResponse),
      } as Response);
    }
    if (urlStr.includes("/approve")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFinalizeResponse),
      } as Response);
    }
    if (urlStr.includes("/reports/") && !urlStr.includes("/patch") && !urlStr.includes("/approve")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            report_id: "trpt-1700000000-abc12345",
            draft_json: mockGenerateResponse,
            status: "draft",
          }),
      } as Response);
    }
    return Promise.reject(new Error(`Unmocked URL: ${urlStr}`));
  });
}
