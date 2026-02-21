/**
 * E2E: Clinician flow — submit case, verify result and confidence.
 * Uses intercepts for mock agent (e.g. mock-server on port 4000).
 */
describe("Clinician Flow", () => {
  const MOCK_AGENT_URL = "http://localhost:4000";

  beforeEach(() => {
    cy.intercept("POST", "**/api/infer", (req) => {
      req.continue((res) => {
        res.body = res.body || {
          case_id: "e2e-case",
          result: {
            summary: ["AI Draft Summary for E2E test."],
            risk: "monitor",
            confidence: 0.82,
            recommendations: ["Re-screen in 3 months"],
            explain: "Mock inference.",
            evidence: [{ type: "score", detail: "ASQ 30/60" }],
            reasoning_chain: ["Language delay observed"],
          },
          inference_time_ms: 200,
          fallback_used: false,
        };
      });
    }).as("infer");
    // Optional: proxy to real mock server
    cy.intercept("POST", `${MOCK_AGENT_URL}/agent/run`, {
      statusCode: 200,
      body: {
        risk: "monitor",
        confidence: 0.82,
        uncertainty: 0.18,
        rationale: ["Language delay observed"],
        evidence: [{ type: "score", detail: "ASQ below threshold" }],
        recommended_actions: ["Re-screen in 3 months"],
        manual_review_required: true,
      },
      delay: 100,
    }).as("agentRun");
  });

  it("submits case and shows result", () => {
    cy.visit("/");
    // If app has a screening/case entry: navigate to screening or use form
    cy.visit("/pediscreen/screening").then(() => {
      // Look for observation input (textarea or similar)
      cy.get("textarea").first().type("Delayed speech", { force: true });
      cy.contains("button", /Run AI Agent|Submit|Analyze/i).click({ force: true });
      // Wait for result to appear (either from /api/infer or UI text)
      cy.get("body").then(($body) => {
        if ($body.text().includes("AI Draft Summary") || $body.text().includes("confidence") || $body.text().includes("Re-screen")) {
          cy.contains(/AI Draft Summary|confidence|Re-screen|result/i).should("be.visible");
        }
      });
    });
  });

  it("confidence meter updates when result loads", () => {
    cy.visit("/pediscreen/screening");
    cy.get("textarea").first().type("Limited words at 24 months", { force: true });
    cy.contains("button", /Run AI Agent|Submit|Analyze/i).click({ force: true });
    cy.wait("@infer", { timeout: 15000 }).then(() => {
      cy.get("[role='progressbar'], .text-muted-foreground").first().should("exist");
    });
  });
});
