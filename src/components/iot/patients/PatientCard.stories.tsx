import type { Meta, StoryObj } from "@storybook/react";
import { PatientCard } from "./PatientCard";
import type { PatientMockDataBundle, VitalAlert } from "@/types/iot";

const makeBundle = (overrides?: Partial<PatientMockDataBundle>): PatientMockDataBundle => ({
  patient: {
    id: "p-emma",
    displayName: "Emma",
    ageMonths: 30,
    avatarSeed: "emma",
    primaryCondition: "Asthma risk follow‑up",
    caregiverRole: "mother",
  },
  devices: [],
  realtimeVitals: [
    {
      timestamp: new Date(),
      heartRate: 112,
      respiratoryRate: 24,
      oxygenSaturation: 98,
      bodyTemperature: 36.9,
      activityLevel: "moderate",
      bloodPressure: undefined,
      deviceBattery: 88,
      signalStrength: -65,
    },
  ],
  vitals24h: [],
  vitals7d: [],
  growthTimeline: [],
  alerts: [],
  anomalies: [],
  compliance: [],
  ...overrides,
});

const meta: Meta<typeof PatientCard> = {
  title: "IoT/PatientCard",
  component: PatientCard,
  args: {
    bundle: makeBundle(),
    alerts: [] as VitalAlert[],
  },
};

export default meta;
type Story = StoryObj<typeof PatientCard>;

export const Healthy: Story = {
  args: {
    bundle: makeBundle(),
    alerts: [],
  },
};

export const Warning: Story = {
  args: {
    bundle: makeBundle(),
    alerts: [
      {
        id: "a1",
        type: "warning",
        vital: "bodyTemperature",
        currentValue: 38.3,
        threshold: { min: 36.5, max: 37.8 },
        duration: 600,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ],
  },
};

export const Critical: Story = {
  args: {
    bundle: makeBundle(),
    alerts: [
      {
        id: "a2",
        type: "critical",
        vital: "oxygenSaturation",
        currentValue: 90,
        threshold: { min: 95, max: 100 },
        duration: 300,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ],
  },
};

