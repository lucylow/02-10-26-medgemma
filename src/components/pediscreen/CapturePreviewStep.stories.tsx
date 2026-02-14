import type { Meta, StoryObj } from "@storybook/react";
import CapturePreviewStep from "./CapturePreviewStep";

const meta: Meta<typeof CapturePreviewStep> = {
  title: "PediScreen/CapturePreviewStep",
  component: CapturePreviewStep,
  parameters: {
    layout: "centered",
    a11y: {
      config: {
        rules: [{ id: "label", enabled: true }],
      },
    },
  },
  argTypes: {
    useEmbeddingsOnly: { control: "boolean" },
    onRetake: { action: "retake" },
    onUseImage: { action: "useImage" },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const sampleImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' fill='%23999' text-anchor='middle' dy='.3em'%3ESample%3C/text%3E%3C/svg%3E";

export const EmbeddingsOnly: Story = {
  args: {
    imagePreview: sampleImage,
    useEmbeddingsOnly: true,
    onRetake: () => {},
    onUseImage: () => {},
  },
};

export const RawImage: Story = {
  args: {
    imagePreview: sampleImage,
    useEmbeddingsOnly: false,
    onRetake: () => {},
    onUseImage: () => {},
  },
};
