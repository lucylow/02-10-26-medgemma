import type { Meta, StoryObj } from "@storybook/react";
import ImageUploadConsentModal from "./ImageUploadConsentModal";

const meta: Meta<typeof ImageUploadConsentModal> = {
  title: "PediScreen/ImageUploadConsentModal",
  component: ImageUploadConsentModal,
  parameters: {
    layout: "centered",
    a11y: {
      config: {
        rules: [{ id: "label", enabled: true }],
      },
    },
  },
  argTypes: {
    open: { control: "boolean" },
    onConsent: { action: "consent" },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    onConsent: () => {},
  },
};
