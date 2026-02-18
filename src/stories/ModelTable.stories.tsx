import type { Meta, StoryObj } from "@storybook/react";
import { ModelTable } from "@/components/charts/ModelTable";

const meta: Meta<typeof ModelTable> = {
  title: "Telemetry/ModelTable",
  component: ModelTable,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ModelTable>;

const mockModels = [
  {
    model_id: "gemini-3-flash-preview",
    provider: "google",
    calls: 721,
    avg_latency_ms: 320,
    error_rate: 0.14,
    fallback_rate: 0.28,
    cost_estimate_usd: 0.0086,
    adapters: ["medgemma_pediscreen_v1"],
    last_used: "2026-02-15T10:30:00Z",
  },
  {
    model_id: "medgemma-2b-it",
    provider: "internal",
    calls: 200,
    avg_latency_ms: 580,
    error_rate: 1.0,
    fallback_rate: 2.0,
    cost_estimate_usd: 0.0024,
    adapters: ["baseline_adapter"],
    last_used: "2026-02-14T08:00:00Z",
  },
];

export const Default: Story = {
  args: {
    models: mockModels,
  },
};

export const Empty: Story = {
  args: {
    models: [],
  },
};

export const HighErrors: Story = {
  args: {
    models: [
      {
        model_id: "unstable-model-v0",
        provider: "experimental",
        calls: 50,
        avg_latency_ms: 1200,
        error_rate: 12.0,
        fallback_rate: 18.0,
        cost_estimate_usd: 0.001,
        adapters: ["test_adapter"],
        last_used: "2026-02-15T12:00:00Z",
      },
    ],
  },
};
