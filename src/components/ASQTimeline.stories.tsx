import type { Meta, StoryObj } from "@storybook/react";
import { ASQTimeline } from "@/components/ASQTimeline";

const meta: Meta<typeof ASQTimeline> = {
  title: "Clinical/ASQTimeline",
  component: ASQTimeline,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof ASQTimeline>;

export const Default: Story = {};
