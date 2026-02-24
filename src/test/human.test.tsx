/**
 * Human-centered medical UX tests: keyboard nav, WCAG-friendly patterns, mock data.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  HumanizedMockGenerator,
  getHumanizedCohort,
  type HumanizedPatient,
} from "@/data/clinical/HumanizedMockData";
import { PatientRow } from "@/components/patients/PatientRow";
import { HumanCenteredPatientList } from "@/components/patients/HumanCenteredPatientList";
import { ThemeProvider } from "@/providers/ThemeProvider";

describe("HumanizedMockData", () => {
  it("generates cohort with required HumanizedPatient fields", () => {
    const cohort = HumanizedMockGenerator.generateRealisticCohort(5);
    expect(cohort).toHaveLength(5);
    cohort.forEach((p) => {
      expect(p.id).toMatch(/^pt-\d{6}$/);
      expect(p.mrn).toMatch(/^MRN-[A-Z0-9]+$/);
      expect(p.name.first).toBeTruthy();
      expect(p.name.last).toBeTruthy();
      expect(p.name.preferred).toBeTruthy();
      expect(p.demographics.age_months).toBeGreaterThanOrEqual(1);
      expect(p.demographics.age_months).toBeLessThanOrEqual(60);
      expect(["M", "F", "Other"]).toContain(p.demographics.gender);
      expect(["referral", "urgent", "monitor", "ontrack"]).toContain(
        p.clinical.risk_level
      );
      expect(p.clinical.confidence).toBeGreaterThanOrEqual(0.65);
      expect(p.chw.assigned).toBeTruthy();
      expect(p.story).toBeTruthy();
    });
  });

  it("getHumanizedCohort returns requested size", () => {
    const cohort = getHumanizedCohort(100);
    expect(cohort).toHaveLength(100);
  });
});

describe("PatientRow", () => {
  const mockPatient: HumanizedPatient = {
    id: "pt-000001",
    mrn: "MRN-ABC123",
    name: { first: "Sofia", last: "Patel", preferred: "Sofia" },
    demographics: {
      age_months: 24,
      dob: "2022-01-15",
      gender: "F",
      location: "Rural Maharashtra, India",
    },
    clinical: {
      asq_scores: { communication: 50, gross_motor: 55 },
      growth_z: { length: 0.5, weight: 0.2 },
      risk_level: "ontrack",
      confidence: 0.92,
      last_screening: "2/20/2025",
    },
    chw: {
      assigned: "Maria Gonzalez",
      contact: "+919876543210",
      photo_url: "/mock/chw/0.jpg",
    },
    story: "Regular follow-up - improving.",
  };

  it("renders patient name and risk level", () => {
    const onClick = vi.fn();
    render(
      <ThemeProvider>
        <PatientRow
          patient={mockPatient}
          isSelected={false}
          onClick={onClick}
          tabIndex={0}
        />
      </ThemeProvider>
    );
    expect(screen.getByText("Sofia")).toBeInTheDocument();
    expect(screen.getByText("Maria Gonzalez")).toBeInTheDocument();
    expect(screen.getByLabelText(/Open chart for Sofia/)).toBeInTheDocument();
  });

  it("calls onClick on Enter key", async () => {
    const onClick = vi.fn();
    render(
      <ThemeProvider>
        <PatientRow
          patient={mockPatient}
          isSelected={true}
          onClick={onClick}
          tabIndex={0}
        />
      </ThemeProvider>
    );
    const row = screen.getByRole("button", { name: /Open chart for Sofia/ });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onClick).toHaveBeenCalled();
  });

  it("calls onClick on Space key", async () => {
    const onClick = vi.fn();
    render(
      <ThemeProvider>
        <PatientRow
          patient={mockPatient}
          isSelected={true}
          onClick={onClick}
          tabIndex={0}
        />
      </ThemeProvider>
    );
    const row = screen.getByRole("button", { name: /Open chart for Sofia/ });
    fireEvent.keyDown(row, { key: " " });
    expect(onClick).toHaveBeenCalled();
  });
});

describe("HumanCenteredPatientList", () => {
  it("renders search and filter controls", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <HumanCenteredPatientList />
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(
      screen.getByRole("searchbox", { name: /Search patients/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Filter by risk/ })
    ).toBeInTheDocument();
  });

  it("shows patient list heading", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <HumanCenteredPatientList />
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(screen.getByRole("heading", { name: /Patient List/ })).toBeInTheDocument();
  });
});
