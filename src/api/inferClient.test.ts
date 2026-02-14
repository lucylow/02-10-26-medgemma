import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  postInfer,
  mockInfer,
  resetCircuitBreaker,
} from "./inferClient";

describe("inferClient", () => {
  beforeEach(() => {
    resetCircuitBreaker();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("mockInfer returns expected schema", () => {
    const result = mockInfer({ age_months: 24 });
    expect(result).toMatchObject({
      summary: expect.any(Array),
      risk: expect.stringMatching(/^(low|monitor|refer)$/),
      recommendations: expect.any(Array),
      parent_text: expect.any(String),
      explain: expect.any(Array),
      confidence: expect.any(Number),
    });
  });

  it("postInfer returns result with expected shape", async () => {
    const result = await postInfer({ age_months: 24 });
    expect(result).toMatchObject({
      summary: expect.any(Array),
      risk: expect.any(String),
      confidence: expect.any(Number),
    });
  });

  it("postInfer falls back to mock on fetch failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network"));
    const result = await postInfer({ age_months: 24 });
    expect(result).toMatchObject({
      summary: expect.any(Array),
      risk: expect.any(String),
    });
  });
});
