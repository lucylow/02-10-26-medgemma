import type { Meta, StoryObj } from "@storybook/react";
import { ROPGallery } from "@/components/ROPGallery";

const meta: Meta<typeof ROPGallery> = {
  title: "Clinical/ROPGallery",
  component: ROPGallery,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof ROPGallery>;

export const Default: Story = {};
export const InSection: Story = {
  render: () => (
    <section className="py-16 bg-muted/30">
      <ROPGallery />
    </section>
  ),
};
