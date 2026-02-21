import type { Meta, StoryObj } from "@storybook/react";
import { PrimitiveButton } from "./Button";

const meta: Meta<typeof PrimitiveButton> = {
  title: "UI Primitives/Button",
  component: PrimitiveButton,
  tags: ["autodocs"],
  parameters: {
    a11y: { disable: false },
  },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost"] },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof PrimitiveButton>;

export const Primary: Story = {
  args: { children: "Start screening", variant: "primary" },
};

export const Secondary: Story = {
  args: { children: "Cancel", variant: "secondary" },
};

export const Ghost: Story = {
  args: { children: "Skip", variant: "ghost" },
};

export const Disabled: Story = {
  args: { children: "Disabled", variant: "primary", disabled: true },
};

export const Loading: Story = {
  args: { children: "Submitting…", variant: "primary", loading: true },
};

export const WithAriaLabel: Story = {
  args: { children: "✓", variant: "primary", "aria-label": "Confirm consent" },
};
