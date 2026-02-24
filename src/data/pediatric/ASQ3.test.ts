import { describe, it, expect } from "vitest";
import {
  ASQ3Dataset,
  type ASQ3DomainScores,
  type ASQ3Cutoffs,
  type ASQ3RiskLevel,
} from "@/data/pediatric/ASQ3Dataset";

describe("ASQ3Dataset", () => {
  describe("getAgeCutoffs", () => {
    it("returns cutoffs for age 1", () => {
      const c = ASQ3Dataset.getAgeCutoffs(1);
      expect(c.communication).toBeGreaterThanOrEqual(18);
      expect(c.gross_motor).toBeGreaterThanOrEqual(20);
      expect(c.fine_motor).toBeGreaterThanOrEqual(18);
      expect(c.problem_solving).toBeGreaterThanOrEqual(18);
      expect(c.personal_social).toBeGreaterThanOrEqual(18);
    });

    it("returns cutoffs for age 24", () => {
      const c = ASQ3Dataset.getAgeCutoffs(24);
      expect(c.communication).toBeLessThanOrEqual(42);
      expect(c.gross_motor).toBeLessThanOrEqual(48);
      expect(typeof c.communication).toBe("number");
      expect(typeof c.gross_motor).toBe("number");
    });

    it("returns cutoffs for age 60", () => {
      const c = ASQ3Dataset.getAgeCutoffs(60);
      expect(c.communication).toBeGreaterThanOrEqual(18);
      expect(c.gross_motor).toBeGreaterThanOrEqual(20);
    });

    it("clamps age to 1-60", () => {
      const c0 = ASQ3Dataset.getAgeCutoffs(0);
      const c100 = ASQ3Dataset.getAgeCutoffs(100);
      expect(c0).toEqual(ASQ3Dataset.getAgeCutoffs(1));
      expect(c100).toEqual(ASQ3Dataset.getAgeCutoffs(60));
    });
  });

  describe("calculateRiskFlags", () => {
    it("flags no domains when all scores above cutoff", () => {
      const cutoffs: ASQ3Cutoffs = {
        communication: 20,
        gross_motor: 25,
        fine_motor: 22,
        problem_solving: 24,
        personal_social: 23,
      };
      const scores: ASQ3DomainScores = {
        communication: 40,
        gross_motor: 45,
        fine_motor: 42,
        problem_solving: 44,
        personal_social: 43,
      };
      const flags = ASQ3Dataset.calculateRiskFlags(scores, cutoffs);
      expect(flags).toHaveLength(0);
    });

    it("flags communication_delay when communication below cutoff", () => {
      const cutoffs: ASQ3Cutoffs = {
        communication: 30,
        gross_motor: 40,
        fine_motor: 35,
        problem_solving: 38,
        personal_social: 36,
      };
      const scores: ASQ3DomainScores = {
        communication: 25,
        gross_motor: 45,
        fine_motor: 42,
        problem_solving: 44,
        personal_social: 43,
      };
      const flags = ASQ3Dataset.calculateRiskFlags(scores, cutoffs);
      expect(flags).toContain("communication_delay");
      expect(flags).toHaveLength(1);
    });

    it("flags multiple domains when multiple below cutoff", () => {
      const cutoffs: ASQ3Cutoffs = {
        communication: 35,
        gross_motor: 40,
        fine_motor: 38,
        problem_solving: 39,
        personal_social: 37,
      };
      const scores: ASQ3DomainScores = {
        communication: 30,
        gross_motor: 35,
        fine_motor: 36,
        problem_solving: 44,
        personal_social: 43,
      };
      const flags = ASQ3Dataset.calculateRiskFlags(scores, cutoffs);
      expect(flags).toContain("communication_delay");
      expect(flags).toContain("gross_motor_concern");
      expect(flags).toContain("fine_motor_concern");
      expect(flags).toHaveLength(3);
    });
  });

  describe("determineOverallRisk", () => {
    it("returns ontrack for 0 flags", () => {
      expect(ASQ3Dataset.determineOverallRisk(0)).toBe("ontrack");
    });
    it("returns monitor for 1 flag", () => {
      expect(ASQ3Dataset.determineOverallRisk(1)).toBe("monitor");
    });
    it("returns urgent for 2 flags", () => {
      expect(ASQ3Dataset.determineOverallRisk(2)).toBe("urgent");
    });
    it("returns referral for 3+ flags", () => {
      expect(ASQ3Dataset.determineOverallRisk(3)).toBe("referral");
      expect(ASQ3Dataset.determineOverallRisk(5)).toBe("referral");
    });
  });

  describe("generateCompleteDataset", () => {
    it("returns requested number of cases", () => {
      const cases = ASQ3Dataset.generateCompleteDataset(240);
      expect(cases).toHaveLength(240);
    });

    it("returns 14400 cases by default", () => {
      const cases = ASQ3Dataset.generateCompleteDataset();
      expect(cases).toHaveLength(14400);
    });

    it("each case has required fields", () => {
      const cases = ASQ3Dataset.generateCompleteDataset(100);
      cases.forEach((c, i) => {
        expect(c.id).toBe(`asq3-${i.toString().padStart(6, "0")}`);
        expect(c.child_id).toMatch(/^child-\d+$/);
        expect(c.age_months).toBeGreaterThanOrEqual(1);
        expect(c.age_months).toBeLessThanOrEqual(60);
        expect(c.domain_scores).toBeDefined();
        expect(c.cutoffs).toBeDefined();
        expect(c.risk_flags).toBeInstanceOf(Array);
        expect(["referral", "urgent", "monitor", "ontrack"]).toContain(c.calculated_risk);
        expect(c.date_assessed).toBeInstanceOf(Date);
      });
    });

    it("risk matches flag count", () => {
      const cases = ASQ3Dataset.generateCompleteDataset(200);
      cases.forEach((c) => {
        const expectedRisk: ASQ3RiskLevel =
          c.risk_flags.length === 0
            ? "ontrack"
            : c.risk_flags.length === 1
              ? "monitor"
              : c.risk_flags.length === 2
                ? "urgent"
                : "referral";
        expect(c.calculated_risk).toBe(expectedRisk);
      });
    });

    it("ages cycle 1-60", () => {
      const cases = ASQ3Dataset.generateCompleteDataset(120);
      const ages = cases.map((c) => c.age_months);
      expect(ages).toContain(1);
      expect(ages).toContain(60);
      const uniqueAges = new Set(ages);
      expect(uniqueAges.size).toBe(60);
    });
  });
});
