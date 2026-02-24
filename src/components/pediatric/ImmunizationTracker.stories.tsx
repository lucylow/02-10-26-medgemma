import type { Meta, StoryObj } from "@storybook/react";
import { ImmunizationTracker } from "./ImmunizationTracker";
import type { ScheduleId } from "./ImmunizationTracker";

const meta: Meta<typeof ImmunizationTracker> = {
  title: "Pediatric/ImmunizationTracker",
  component: ImmunizationTracker,
  parameters: { layout: "centered" },
  argTypes: {
    country: {
      control: "select",
      options: [
        "WHO_EPI",
        "CDC_US",
        "India_UIP",
        "UK",
        "Canada",
        "Australia",
        "Brazil",
        "SouthAfrica",
        "Nigeria",
        "Kenya",
        "Pakistan",
        "Indonesia",
      ] as ScheduleId[],
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const WHO_EPI: Story = {
  args: { country: "WHO_EPI" },
};

export const CDC_US: Story = {
  args: { country: "CDC_US" },
};

export const India_UIP: Story = {
  args: { country: "India_UIP" },
};
