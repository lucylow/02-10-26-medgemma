import type { Meta, StoryObj } from "@storybook/react";
import { ASQ3Dashboard } from "./ASQ3Dashboard";

const meta: Meta<typeof ASQ3Dashboard> = {
  title: "Pediatric/ASQ3Dashboard",
  component: ASQ3Dashboard,
  parameters: { layout: "centered" },
  argTypes: {
    age_months: { control: { type: "range", min: 1, max: 60 }, name: "Age (months)" },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { age_months: 24 },
};

export const YoungInfant: Story = {
  args: { age_months: 6 },
};

export const Toddler: Story = {
  args: { age_months: 36 },
};
