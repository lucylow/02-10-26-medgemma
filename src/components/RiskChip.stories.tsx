import type { Meta, StoryObj } from "@storybook/react";
import { RiskChip } from "@/components/RiskChip";

const meta: Meta<typeof RiskChip> = {
  title: "Clinical/RiskChip",
  component: RiskChip,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof RiskChip>;

export const Referral: Story = {
  args: { level: "referral" },
};

export const Urgent: Story = {
  args: { level: "urgent" },
};

export const Monitor: Story = {
  args: { level: "monitor" },
};

export const Ontrack: Story = {
  args: { level: "ontrack" },
};

export const AllLevels: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <RiskChip level="referral" />
      <RiskChip level="urgent" />
      <RiskChip level="monitor" />
      <RiskChip level="ontrack" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <RiskChip level="referral" size="sm" />
      <RiskChip level="urgent" size="md" />
      <RiskChip level="monitor" size="lg" />
    </div>
  ),
};

export const CustomLabel: Story = {
  args: { level: "referral", children: "IMMEDIATE REFERRAL" },
};
