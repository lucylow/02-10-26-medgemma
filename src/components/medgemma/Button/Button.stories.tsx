import type { Meta, StoryObj } from "@storybook/react";
import { MedGemmaButton } from "./Button";

const meta: Meta<typeof MedGemmaButton> = {
  title: "MedGemma/Button",
  component: MedGemmaButton,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MedGemmaButton>;

export const Primary: Story = {
  args: { children: "Start Screening", variant: "primary" },
};

export const Secondary: Story = {
  args: { children: "Settings", variant: "secondary" },
};

export const Outline: Story = {
  args: { children: "Learn More", variant: "outline" },
};

export const Disabled: Story = {
  args: { children: "Disabled", variant: "primary", disabled: true },
};
