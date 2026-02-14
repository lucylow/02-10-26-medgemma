import type { Meta, StoryObj } from "@storybook/react";
import { RiskChip } from "./RiskChip";

const meta: Meta<typeof RiskChip> = {
  title: "MedGemma/RiskChip",
  component: RiskChip,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof RiskChip>;

export const OnTrack: Story = { args: { risk: "on_track" } };
export const Monitor: Story = { args: { risk: "monitor" } };
export const Refer: Story = { args: { risk: "refer" } };
export const Unknown: Story = { args: { risk: "unknown" } };
