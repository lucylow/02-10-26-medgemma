import type { Meta, StoryObj } from "@storybook/react";
import { MedGemmaCard } from "./Card";

const meta: Meta<typeof MedGemmaCard> = {
  title: "MedGemma/Card",
  component: MedGemmaCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MedGemmaCard>;

export const Default: Story = {
  args: {
    children: "Card content goes here.",
  },
};

export const WithTitle: Story = {
  args: {
    title: "PediScreen AI — Quick Screening",
    children: "Start a developmental screening for your child.",
  },
};
