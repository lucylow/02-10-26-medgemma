import type { Meta, StoryObj } from "@storybook/react";
import { GrowthChart } from "./GrowthChart";
import type { GrowthPoint } from "./GrowthChart";

const sampleData: GrowthPoint[] = [
  { age_months: 6, length_cm: 65, weight_kg: 7.2, z_length: 0.1, z_weight: -0.2 },
  { age_months: 9, length_cm: 70, weight_kg: 8.5, z_length: 0.0, z_weight: 0.1 },
  { age_months: 12, length_cm: 74, weight_kg: 9.2, z_length: -0.1, z_weight: 0.0 },
  { age_months: 18, length_cm: 80, weight_kg: 10.5, z_length: 0.2, z_weight: 0.3 },
  { age_months: 24, length_cm: 86, weight_kg: 12.0, z_length: 0.1, z_weight: 0.2 },
];

const meta: Meta<typeof GrowthChart> = {
  title: "Pediatric/GrowthChart",
  component: GrowthChart,
  parameters: { layout: "centered" },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithInitialData: Story = {
  args: { initialData: sampleData },
};
