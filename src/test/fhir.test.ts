import { describe, it, expect, beforeAll } from "vitest";
import { CFreeFHIRClient } from "@/lib/fhir/cFreeClient";
import type { FHIRBundle, FHIRPatient } from "@/types/fhir";

describe("CFreeFHIRClient", () => {
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    // Ensure any previous fetch mocks are cleared.
    // @ts-expect-error vitest global
    vi.restoreAllMocks?.();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns de-identified patients with hashed ids and age in months", async () => {
    const patient: FHIRPatient = {
      resourceType: "Patient",
      id: "patient-123",
      birthDate: "2020-01-15",
      gender: "female",
    };

    const bundle: FHIRBundle = {
      resourceType: "Bundle",
      entry: [{ resource: patient }],
    };

    globalThis.fetch = vi
      .fn()
      // Patient search
      .mockResolvedValueOnce({
        ok: true,
        json: async () => bundle,
      } as Response)
      // Observations
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resourceType: "Bundle", entry: [] } as FHIRBundle),
      } as Response)
      // Conditions
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resourceType: "Bundle", entry: [] } as FHIRBundle),
      } as Response)
      // Encounters
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resourceType: "Bundle", entry: [] } as FHIRBundle),
      } as Response);

    const client = new CFreeFHIRClient("https://fhir.example.org");
    const cohort = await client.fetchDeidentifiedCohort({ limit: 1 });

    expect(cohort).toHaveLength(1);
    const p = cohort[0];

    expect(p.patient_id).toHaveLength(16);
    expect(p.gender).toBe("F");
    expect(p.age_months).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(p.observations)).toBe(true);
  });
});

