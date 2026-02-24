import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PatientCardGrid } from "@/components/iot/patients/PatientCardGrid";
import type { PatientMockDataBundle, VitalAlert } from "@/types/iot";

const makeBundle = (id: string, name: string): PatientMockDataBundle => ({
  patient: {
    id,
    displayName: name,
    ageMonths: 24,
    avatarSeed: name,
    primaryCondition: "Demo",
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

describe("PatientCardGrid", () => {
  it("renders patients when provided", () => {
    const patients: PatientMockDataBundle[] = [
      makeBundle("p-1", "A"),
      makeBundle("p-2", "B"),
    ];
    const alertsByPatient: Record<string, VitalAlert[]> = {
      "p-1": [],
      "p-2": [],
    };
    render(
      <PatientCardGrid
        patients={patients}
        alertsByPatient={alertsByPatient}
        loading={false}
      />,
    );

    expect(screen.getByText(/At-a-glance monitoring/i)).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("shows empty state when no patients", () => {
    render(
      <PatientCardGrid patients={[]} alertsByPatient={{}} loading={false} />,
    );

    expect(
      screen.getByText(/No children are enrolled in IoT monitoring yet/i),
    ).toBeInTheDocument();
  });
});

