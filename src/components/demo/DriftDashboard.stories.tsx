import type { Meta, StoryObj } from "@storybook/react";
import { DriftDashboard } from "./DriftDashboard";

const meta: Meta<typeof DriftDashboard> = {
  title: "Demo/DriftDashboard",
  component: DriftDashboard,
};

export default meta;

type Story = StoryObj<typeof DriftDashboard>;

const defaultData = [
  { date: "2026-01", psi_score: 0.12 },
  { date: "2026-02", psi_score: 0.18 },
];

export const Default: Story = {
  args: {
    data: defaultData,
    severity: "none",
  },
};

export const DriftSpike: Story = {
  args: {
    data: [
      { date: "2025-12", psi_score: 0.1 },
      { date: "2026-01", psi_score: 0.28 },
      { date: "2026-02", psi_score: 0.22 },
    ],
    severity: "high",
    showAlert: true,
  },
};

export const ModerateDrift: Story = {
  args: {
    data: [
      { date: "2026-01", psi_score: 0.21 },
      { date: "2026-02", psi_score: 0.19 },
    ],
    severity: "moderate",
  },
};

export const NoData: Story = {
  args: {
    data: [],
    severity: "none",
  },
};
