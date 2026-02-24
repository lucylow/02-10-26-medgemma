import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PatientCard } from "@/components/iot/patients/PatientCard";
import type { PatientMockDataBundle, VitalAlert } from "@/types/iot";

const makeBundle = (): PatientMockDataBundle => ({
  patient: {
    id: "p-test",
    displayName: "Test Child",
    ageMonths: 36,
    avatarSeed: "seed",
    primaryCondition: "Demo condition",
    caregiverRole: "mother",
  },
  devices: [],
  realtimeVitals: [
    {
      timestamp: new Date(),
      heartRate: 110,
      respiratoryRate: 24,
      oxygenSaturation: 98,
      bodyTemperature: 36.8,
      activityLevel: "resting",
      bloodPressure: undefined,
      deviceBattery: 90,
      signalStrength: -65,
    },
  ],
  vitals24h: [],
  vitals7d: [],
  growthTimeline: [],
  alerts: [],
  anomalies: [],
  compliance: [],
});

describe("PatientCard", () => {
  it("renders name and vitals", () => {
    const bundle = makeBundle();
    render(<PatientCard bundle={bundle} alerts={[]} />);

    expect(screen.getByText("Test Child")).toBeInTheDocument();
    expect(screen.getByText(/bpm/i)).toBeInTheDocument();
    expect(screen.getByText(/SpO₂/i)).toBeInTheDocument();
  });

  it("invokes onOpenDetail when clicked", () => {
    const bundle = makeBundle();
    const alerts: VitalAlert[] = [];
    const handler = vi.fn();
    render(
      <PatientCard bundle={bundle} alerts={alerts} onOpenDetail={handler} />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Open monitoring detail for Test Child/i,
      }),
    );
    expect(handler).toHaveBeenCalledWith("p-test");
  });
});

