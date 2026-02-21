import type { Meta, StoryObj } from "@storybook/react";
import { BiasDashboard } from "./BiasDashboard";

const meta: Meta<typeof BiasDashboard> = {
  title: "Demo/BiasDashboard",
  component: BiasDashboard,
};

export default meta;

type Story = StoryObj<typeof BiasDashboard>;

export const Default: Story = {
  args: {
    disparateImpact: 0.92,
    flag: false,
  },
};

export const BiasAlert: Story = {
  args: {
    disparateImpact: 0.82,
    flag: true,
    demographicParity: {
      white: 0.22,
      black: 0.31,
      hispanic: 0.28,
      asian: 0.18,
    },
  },
};

export const NoAlert: Story = {
  args: {
    disparateImpact: 0.95,
    flag: false,
    demographicParity: { white: 0.24, black: 0.23, hispanic: 0.25 },
  },
};
