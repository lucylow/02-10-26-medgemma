import type { Meta, StoryObj } from "@storybook/react";
import {
  PrimitiveCard,
  PrimitiveCardHeader,
  PrimitiveCardBody,
  PrimitiveCardFooter,
} from "./Card";
import { PrimitiveButton } from "./Button";

const meta: Meta<typeof PrimitiveCard> = {
  title: "UI Primitives/Card",
  component: PrimitiveCard,
  tags: ["autodocs"],
  parameters: {
    a11y: { disable: false },
  },
};

export default meta;

type Story = StoryObj<typeof PrimitiveCard>;

export const WithSlots: Story = {
  render: () => (
    <PrimitiveCard>
      <PrimitiveCardHeader>Screening result</PrimitiveCardHeader>
      <PrimitiveCardBody>
        Summary and recommendations appear here. Use header, body, and footer slots.
      </PrimitiveCardBody>
      <PrimitiveCardFooter>
        <PrimitiveButton variant="secondary" onClick={() => {}}>
          Close
        </PrimitiveButton>
      </PrimitiveCardFooter>
    </PrimitiveCard>
  ),
};

export const BodyOnly: Story = {
  render: () => (
    <PrimitiveCard>
      <PrimitiveCardBody>Card with body only.</PrimitiveCardBody>
    </PrimitiveCard>
  ),
};
