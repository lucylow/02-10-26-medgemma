import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { PatientRow } from "./PatientRow";
import { HumanizedMockGenerator } from "@/data/clinical/HumanizedMockData";
import { ThemeProvider } from "@/providers/ThemeProvider";

const samplePatients = HumanizedMockGenerator.generateRealisticCohort(4);

const meta: Meta<typeof PatientRow> = {
  title: "Patients/PatientRow",
  component: PatientRow,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "padded",
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: true },
          { id: "button-name", enabled: true },
        ],
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof PatientRow>;

export const Default: Story = {
  args: {
    patient: samplePatients[0],
    isSelected: false,
    onClick: () => {},
    tabIndex: 0,
  },
};

export const Selected: Story = {
  args: {
    patient: samplePatients[1],
    isSelected: true,
    onClick: () => {},
    tabIndex: 0,
  },
};

export const ReferralRisk: Story = {
  args: {
    patient: { ...samplePatients[2], clinical: { ...samplePatients[2].clinical, risk_level: "referral" } },
    isSelected: false,
    onClick: () => {},
    tabIndex: -1,
  },
};

export const Mobile: Story = {
  args: {
    patient: samplePatients[3],
    isSelected: false,
    onClick: () => {},
    tabIndex: 0,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
