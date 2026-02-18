import type { Meta, StoryObj } from "@storybook/react";
import { UsageTimeseries } from "@/components/charts/UsageTimeseries";

const meta: Meta<typeof UsageTimeseries> = {
  title: "Telemetry/UsageTimeseries",
  component: UsageTimeseries,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof UsageTimeseries>;

const mockData = [
  { date: "2026-02-09", calls: 100, errors: 2, fallbacks: 1, cost: 0.0012 },
  { date: "2026-02-10", calls: 250, errors: 5, fallbacks: 3, cost: 0.003 },
  { date: "2026-02-11", calls: 300, errors: 1, fallbacks: 0, cost: 0.0036 },
  { date: "2026-02-12", calls: 150, errors: 8, fallbacks: 5, cost: 0.0018 },
  { date: "2026-02-13", calls: 200, errors: 3, fallbacks: 2, cost: 0.0024 },
  { date: "2026-02-14", calls: 320, errors: 0, fallbacks: 0, cost: 0.0038 },
  { date: "2026-02-15", calls: 120, errors: 1, fallbacks: 1, cost: 0.0014 },
];

export const Default: Story = {
  args: {
    data: mockData,
  },
};

export const Empty: Story = {
  args: {
    data: [],
  },
};

export const SingleDay: Story = {
  args: {
    data: [{ date: "2026-02-15", calls: 42, errors: 1, fallbacks: 0, cost: 0.0005 }],
  },
};
