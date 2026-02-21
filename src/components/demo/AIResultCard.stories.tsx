import type { Meta, StoryObj } from "@storybook/react";
import { AIResultCard } from "./AIResultCard";

const meta: Meta<typeof AIResultCard> = {
  title: "Demo/AIResultCard",
  component: AIResultCard,
};

export default meta;

type Story = StoryObj<typeof AIResultCard>;

export const Default: Story = {
  args: {
    result: {
      risk: "monitor",
      confidence: 0.82,
      uncertainty: 0.18,
      evidence: [
        { type: "milestone", detail: "Expressive language below norm" },
        { type: "score", detail: "ASQ communication 30/60" },
      ],
      rationale: [
        "Language milestone delay at 24 months",
        "Below cutoff threshold",
      ],
      recommended_actions: ["Re-screen in 3 months", "Consider speech referral"],
      manual_review_required: true,
    },
  },
};

export const HighRisk: Story = {
  args: {
    result: {
      risk: "refer",
      confidence: 0.88,
      uncertainty: 0.12,
      evidence: [
        { type: "milestone", detail: "No two-word phrases at 24mo" },
        { type: "score", detail: "ASQ 22/60" },
      ],
      rationale: [
        "Multiple communication delays",
        "Below referral cutoff",
      ],
      recommended_actions: ["Refer to early intervention", "Speech evaluation"],
      manual_review_required: true,
    },
  },
};

export const LowConfidence: Story = {
  args: {
    result: {
      risk: "monitor",
      confidence: 0.52,
      uncertainty: 0.48,
      evidence: [{ type: "score", detail: "Borderline ASQ" }],
      rationale: ["Insufficient data for high confidence"],
      recommended_actions: ["Re-screen in 3 months", "Clinical review recommended"],
      manual_review_required: true,
    },
  },
};

export const DriftSpikeState: Story = {
  args: {
    result: {
      risk: "monitor",
      confidence: 0.61,
      uncertainty: 0.39,
      evidence: [
        { type: "milestone", detail: "Model drift detected; interpretation may vary" },
      ],
      rationale: [
        "Recent distribution shift in screening population",
        "Lower confidence until recalibration",
      ],
      recommended_actions: ["Manual review", "Re-screen in 3 months"],
      manual_review_required: true,
    },
  },
};

export const BiasAlertState: Story = {
  args: {
    result: {
      risk: "monitor",
      confidence: 0.7,
      uncertainty: 0.3,
      evidence: [
        { type: "text", detail: "Bias audit flag: subgroup performance gap" },
      ],
      rationale: [
        "Fairness review in progress for this cohort",
        "Proceed with standard recommendations",
      ],
      recommended_actions: ["Clinical judgment", "Re-screen as indicated"],
      manual_review_required: true,
    },
  },
};
