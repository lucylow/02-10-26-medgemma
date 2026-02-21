import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "UI Primitives/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: {
    a11y: { disable: false },
  },
};

export default meta;

type Story = StoryObj<typeof Badge>;

export const AdapterId: Story = {
  args: { label: "Adapter", value: "medgemma-walking-v1" },
};

export const ModelId: Story = {
  args: { label: "Model", value: "gemma-2b" },
};

export const Version: Story = {
  args: { label: "Version", value: "0.2.0" },
};
