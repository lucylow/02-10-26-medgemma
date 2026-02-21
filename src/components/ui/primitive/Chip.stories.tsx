import type { Meta, StoryObj } from "@storybook/react";
import { Chip } from "./Chip";

const meta: Meta<typeof Chip> = {
  title: "UI Primitives/Chip",
  component: Chip,
  tags: ["autodocs"],
  parameters: {
    a11y: { disable: false },
  },
  argTypes: {
    level: { control: "select", options: ["low", "monitor", "high", "refer"] },
  },
};

export default meta;

type Story = StoryObj<typeof Chip>;

export const Low: Story = {
  args: { level: "low" },
};

export const Monitor: Story = {
  args: { level: "monitor" },
};

export const High: Story = {
  args: { level: "high" },
};

export const Refer: Story = {
  args: { level: "refer" },
};

export const CustomLabel: Story = {
  args: { level: "low", label: "On track" },
};
