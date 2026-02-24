import type { Meta, StoryObj } from "@storybook/react";
import { ClinicalCard } from "@/components/ClinicalCard";

const meta: Meta<typeof ClinicalCard> = {
  title: "Clinical/ClinicalCard",
  component: ClinicalCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof ClinicalCard>;

export const ReferralCard: Story = {
  args: {
    risk: "referral",
    title: "REFERRAL (3)",
    children: "Immediate specialist needed. These cases require same-day or next-day follow-up.",
  },
};

export const UrgentCard: Story = {
  args: {
    risk: "urgent",
    title: "URGENT (5)",
    children: "72hr intervention recommended. Schedule follow-up within 72 hours.",
  },
};

export const WithActions: Story = {
  args: {
    risk: "monitor",
    title: "Monitor (12)",
    children: "30-day follow-up. Re-screen or collect additional observations.",
    actions: (
      <>
        <button type="button" style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc" }}>
          View cases
        </button>
        <button type="button" style={{ padding: "8px 16px", borderRadius: 8, background: "#1A73E8", color: "#fff", border: "none" }}>
          Export
        </button>
      </>
    ),
  },
};

export const OntrackCard: Story = {
  args: {
    risk: "ontrack",
    title: "On track (30)",
    children: "Routine screening. No immediate action required.",
  },
};

export const CardComposition: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
      <ClinicalCard risk="referral" title="REFERRAL (3)">
        Immediate specialist needed
      </ClinicalCard>
      <ClinicalCard risk="urgent" title="URGENT (5)">
        72hr intervention
      </ClinicalCard>
      <ClinicalCard risk="monitor" title="MONITOR (12)">
        30-day follow-up
      </ClinicalCard>
      <ClinicalCard risk="ontrack" title="ON TRACK (30)">
        Routine
      </ClinicalCard>
    </div>
  ),
};
