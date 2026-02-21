import type { Meta, StoryObj } from "@storybook/react";
import { CaseForm } from "./CaseForm";

const meta: Meta<typeof CaseForm> = {
  title: "Demo/CaseForm",
  component: CaseForm,
};

export default meta;

type Story = StoryObj<typeof CaseForm>;

export const Default: Story = {
  args: {
    ageMonths: 24,
    observations: "",
    submitLabel: "Run AI Agent",
  },
};

export const HighRiskPrefill: Story = {
  args: {
    ageMonths: 24,
    observations: "No two-word phrases. Parent very concerned about speech. Limited eye contact.",
    submitLabel: "Run AI Agent",
  },
};

export const LowRiskPrefill: Story = {
  args: {
    ageMonths: 18,
    observations: "Uses 15+ words, points to objects, follows simple commands.",
    submitLabel: "Run AI Agent",
  },
};

export const Disabled: Story = {
  args: {
    ageMonths: 24,
    observations: "Submitting...",
    disabled: true,
    submitLabel: "Running...",
  },
};
