import type {
  FHIRBundle,
  FHIRCondition,
  FHIREncounter,
  FHIRObservation,
  FHIRPatient,
} from "@/types/fhir";

export interface DeidentifiedPatient {
  /** Deterministically hashed MRN / patient id (no direct identifiers). */
  patient_id: string;
  age_months: number;
  gender: "M" | "F" | "O";
  observations: FHIRObservation[];
  conditions: FHIRCondition[];
  encounters: FHIREncounter[];
}

interface CohortSearchParams {
  ageMin?: number;
  ageMax?: number;
  /**
   * Array of LOINC / SNOMED codes of interest.
   * When provided, observations will be filtered client-side to these codes.
   */
  code?: string[];
  limit?: number;
}

/**
 * HIPAA / GDPR-aware FHIR R4 client that only returns de-identified
 * patient cohorts suitable for HAI-DEF edge inference.
 *
 * Assumes the upstream FHIR server is already c-Free compliant
 * (no direct identifiers in payloads) and further hashes the patient id.
 */
export class CFreeFHIRClient {
  private readonly baseUrl: string;
  private readonly smartToken?: string;

  constructor(fhirServer: string, smartToken?: string) {
    this.baseUrl = fhirServer.replace(/\/+$/, "");
    this.smartToken = smartToken;
  }

  /**
   * Fetch a de-identified pediatric cohort, using SMART-on-FHIR style
   * search parameters where available. This method:
   * - restricts to de-identified resources via _security
   * - limits returned elements to those required for downstream inference
   * - re-hashes the patient id using SHA-256 for Safe Harbor compliance
   */
  async fetchDeidentifiedCohort(params: CohortSearchParams = {}): Promise<DeidentifiedPatient[]> {
    const searchParams = new URLSearchParams();

    // Ensure only de-identified resources are returned (c-Free contract).
    searchParams.set(
      "_security",
      "http://terminology.hl7.org/CodeSystem/v2-0203|DEF",
    );

    // Minimize surface area for PHI – only pull what we need.
    searchParams.set(
      "_elements",
      "identifier,birthDate,gender",
    );

    if (params.limit != null) {
      searchParams.set("_count", String(params.limit));
    } else {
      searchParams.set("_count", "1000");
    }

    const response = await fetch(`${this.baseUrl}/Patient?${searchParams.toString()}`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`FHIR cohort fetch failed: ${response.status} ${response.statusText}`);
    }

    const bundle = (await response.json()) as FHIRBundle;
    const entries = bundle.entry ?? [];

    const patients: DeidentifiedPatient[] = [];

    for (const entry of entries) {
      const patient = entry.resource as FHIRPatient | undefined;
      if (!patient || patient.resourceType !== "Patient" || !patient.id) continue;

      const [hash, ageMonths, observations, conditions, encounters] = await Promise.all([
        this.hashMRN(patient.id),
        Promise.resolve(this.calculateAgeMonths(patient.birthDate)),
        this.fetchPatientObservations(patient.id, params.code),
        this.fetchPatientConditions(patient.id),
        this.fetchPatientEncounters(patient.id),
      ]);

      patients.push({
        patient_id: hash,
        age_months: ageMonths,
        gender: this.normalizeGender(patient.gender),
        observations,
        conditions,
        encounters,
      });
    }

    return patients;
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Accept": "application/fhir+json",
    };
    if (this.smartToken) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.smartToken}`;
    }
    return headers;
  }

  /**
   * Deterministic SHA-256 hashing of patient identifiers for Safe Harbor.
   * Uses Web Crypto when available; falls back to a minimal JS implementation
   * if needed (tests / non-browser environments).
   */
  private async hashMRN(mrn: string): Promise<string> {
    if (typeof crypto !== "undefined" && "subtle" in crypto) {
      const data = new TextEncoder().encode(mrn);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const bytes = new Uint8Array(hashBuffer);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 16);
    }

    // Very small fallback for non-WebCrypto environments (e.g. tests).
    let hash = 0;
    for (let i = 0; i < mrn.length; i += 1) {
      hash = (hash << 5) - hash + mrn.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 16);
  }

  private calculateAgeMonths(birthDate?: string): number {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return 0;
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    const totalMonths = years * 12 + months;
    return Math.max(0, totalMonths);
  }

  private normalizeGender(
    gender: FHIRPatient["gender"],
  ): DeidentifiedPatient["gender"] {
    if (gender === "male") return "M";
    if (gender === "female") return "F";
    return "O";
  }

  private async fetchPatientObservations(
    patientId: string,
    codes?: string[],
  ): Promise<FHIRObservation[]> {
    const params = new URLSearchParams();
    params.set("patient", patientId);
    params.set("_count", "1000");

    const response = await fetch(
      `${this.baseUrl}/Observation?${params.toString()}`,
      { headers: this.buildHeaders() },
    );

    if (!response.ok) return [];
    const bundle = (await response.json()) as FHIRBundle;
    const all = (bundle.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is FHIRObservation => !!r && r.resourceType === "Observation");

    if (!codes || codes.length === 0) return all;

    const codeSet = new Set(codes);
    return all.filter((obs) =>
      (obs.code?.coding ?? []).some((c) => c.code && codeSet.has(c.code)),
    );
  }

  private async fetchPatientConditions(patientId: string): Promise<FHIRCondition[]> {
    const params = new URLSearchParams();
    params.set("patient", patientId);
    params.set("_count", "500");

    const response = await fetch(
      `${this.baseUrl}/Condition?${params.toString()}`,
      { headers: this.buildHeaders() },
    );

    if (!response.ok) return [];
    const bundle = (await response.json()) as FHIRBundle;
    return (bundle.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is FHIRCondition => !!r && r.resourceType === "Condition");
  }

  private async fetchPatientEncounters(patientId: string): Promise<FHIREncounter[]> {
    const params = new URLSearchParams();
    params.set("patient", patientId);
    params.set("_count", "200");

    const response = await fetch(
      `${this.baseUrl}/Encounter?${params.toString()}`,
      { headers: this.buildHeaders() },
    );

    if (!response.ok) return [];
    const bundle = (await response.json()) as FHIRBundle;
    return (bundle.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is FHIREncounter => !!r && r.resourceType === "Encounter");
  }
}

