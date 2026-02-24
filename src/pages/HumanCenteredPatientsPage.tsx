"use client";

import { HumanCenteredPatientList } from "@/components/patients/HumanCenteredPatientList";
import { HumanCelebrations } from "@/components/HumanCelebrations";

/**
 * Human-centered patient list page: keyboard nav, 96px touch targets,
 * 50K mock cohort, search/filter, and impact celebrations.
 * Route: /pediscreen/patients (or /patients if mounted at root).
 */
export default function HumanCenteredPatientsPage() {
  return (
    <>
      <HumanCenteredPatientList />
      <HumanCelebrations />
    </>
  );
}
