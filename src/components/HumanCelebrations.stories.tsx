import type { Meta, StoryObj } from "@storybook/react";
import { HumanCelebrations } from "@/components/HumanCelebrations";
import { ThemeProvider } from "@/providers/ThemeProvider";

const meta: Meta<typeof HumanCelebrations> = {
  title: "Human-Centered/HumanCelebrations",
  component: HumanCelebrations,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    a11y: {
      config: {
        rules: [{ id: "aria-label", enabled: true }],
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof HumanCelebrations>;

export const Default: Story = {};
