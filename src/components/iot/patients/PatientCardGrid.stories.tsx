import type { Meta, StoryObj } from "@storybook/react";
import { PatientCardGrid } from "./PatientCardGrid";
import type { PatientMockDataBundle, VitalAlert } from "@/types/iot";

const makeBundle = (id: string, name: string): PatientMockDataBundle => ({
  patient: {
    id,
    displayName: name,
    ageMonths: 36,
    avatarSeed: name,
    primaryCondition: "Demo child",
    caregiverRole: "mother",
  },
  devices: [],
  realtimeVitals: [],
  vitals24h: [],
  vitals7d: [],
  growthTimeline: [],
  alerts: [],
  anomalies: [],
  compliance: [],
});

const meta: Meta<typeof PatientCardGrid> = {
  title: "IoT/PatientCardGrid",
  component: PatientCardGrid,
};

export default meta;
type Story = StoryObj<typeof PatientCardGrid>;

const basePatients: PatientMockDataBundle[] = [
  makeBundle("p-1", "Emma"),
  makeBundle("p-2", "Luca"),
  makeBundle("p-3", "Aya"),
];

const baseAlerts: Record<string, VitalAlert[]> = {
  "p-1": [],
  "p-2": [],
  "p-3": [],
};

export const Default: Story = {
  args: {
    patients: basePatients,
    alertsByPatient: baseAlerts,
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    patients: [],
    alertsByPatient: {},
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    patients: [],
    alertsByPatient: {},
    loading: false,
  },
};

