import type { DeidentifiedPatient } from "@/lib/fhir/cFreeClient";
import type { FHIRCondition, FHIREncounter, FHIRObservation } from "@/types/fhir";

interface OpenMRSObs {
  uuid: string;
  person: {
    uuid: string;
    gender?: "M" | "F";
    birthdate?: string;
  };
  obsDatetime?: string;
  concept?: {
    uuid: string;
    display?: string;
  };
  value?: number | string | null;
  encounter?: {
    uuid: string;
    encounterType?: { display?: string };
    location?: { uuid: string; name?: string };
  };
}

interface DHIS2Event {
  event: string;
  program: string;
  orgUnit: string;
  trackedEntityInstance: string;
  eventDate?: string;
  dataValues: Array<{
    dataElement: string;
    value: string;
  }>;
}

interface DHIS2EventsResponse {
  events: DHIS2Event[];
}

/**
 * OpenMRS c-Free client: pulls pediatric observations and aggregates
 * them into a de-identified cohort compatible with the FHIR pipeline.
 */
export class OpenMRSCFreeClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiToken = apiToken;
  }

  async fetchPediatricCohort(
    locationUuid: string,
    ageMin: number = 0,
    ageMax: number = 60,
  ): Promise<DeidentifiedPatient[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("v", "full");
    searchParams.set("limit", "1000");
    searchParams.set("location", locationUuid);

    const resp = await fetch(`${this.baseUrl}/obs?${searchParams.toString()}`, {
      headers: {
        Authorization: `Token ${this.apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      throw new Error(`OpenMRS obs fetch failed: ${resp.status} ${resp.statusText}`);
    }

    const observations = (await resp.json()) as OpenMRSObs[];
    const byPerson = new Map<string, OpenMRSObs[]>();

    for (const obs of observations) {
      const personId = obs.person?.uuid;
      if (!personId) continue;
      if (!byPerson.has(personId)) byPerson.set(personId, []);
      byPerson.get(personId)!.push(obs);
    }

    const cohort: DeidentifiedPatient[] = [];

    for (const [personId, personObs] of byPerson.entries()) {
      const birthdate = personObs[0]?.person?.birthdate;
      const ageMonths = this.calculateAgeMonths(birthdate);
      if (ageMonths < ageMin || ageMonths > ageMax) continue;

      const hash = await this.hashId(personId);

      const fhirObservations: FHIRObservation[] = personObs.map((obs) => ({
        resourceType: "Observation",
        id: obs.uuid,
        code: {
          text: obs.concept?.display,
        },
        effectiveDateTime: obs.obsDatetime,
        valueString: typeof obs.value === "string" ? obs.value : undefined,
        valueQuantity:
          typeof obs.value === "number"
            ? {
                value: obs.value,
              }
            : undefined,
      }));

      const encounter: FHIREncounter | undefined = personObs[0]?.encounter
        ? {
            resourceType: "Encounter",
            id: personObs[0].encounter?.uuid,
            status: "finished",
            class: {
              text: personObs[0].encounter?.encounterType?.display,
            },
            serviceProvider: personObs[0].encounter?.location
              ? {
                  display: personObs[0].encounter.location.name,
                }
              : undefined,
          }
        : undefined;

      cohort.push({
        patient_id: hash,
        age_months: ageMonths,
        gender: (personObs[0]?.person?.gender as DeidentifiedPatient["gender"]) ?? "O",
        observations: fhirObservations,
        conditions: [] as FHIRCondition[],
        encounters: encounter ? [encounter] : [],
      });
    }

    return cohort;
  }

  private calculateAgeMonths(birthdate?: string): number {
    if (!birthdate) return 0;
    const birth = new Date(birthdate);
    if (Number.isNaN(birth.getTime())) return 0;
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    return Math.max(0, years * 12 + months);
  }

  private async hashId(value: string): Promise<string> {
    if (typeof crypto !== "undefined" && "subtle" in crypto) {
      const data = new TextEncoder().encode(value);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const bytes = new Uint8Array(hashBuffer);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 16);
    }
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 16);
  }
}

/**
 * DHIS2 c-Free client for global health pediatric programs.
 */
export class DHIS2CFreeClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.username = username;
    this.password = password;
  }

  async fetchTrackedEntities(
    program: string,
    orgUnit: string,
  ): Promise<DeidentifiedPatient[]> {
    const params = new URLSearchParams();
    params.set("program", program);
    params.set("orgUnit", orgUnit);
    params.set("paging", "false");

    const resp = await fetch(
      `${this.baseUrl}/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${this.username}:${this.password}`)}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!resp.ok) {
      throw new Error(`DHIS2 events fetch failed: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as DHIS2EventsResponse;
    const events = data.events ?? [];

    const patients: DeidentifiedPatient[] = [];

    for (const event of events) {
      const ageMonths = parseFloat(
        event.dataValues.find((dv) => dv.dataElement === "age_months")?.value ??
          "0",
      );

      const hash = await this.hashId(event.trackedEntityInstance);

      const observations: FHIRObservation[] = event.dataValues.map((dv) => ({
        resourceType: "Observation",
        code: { text: dv.dataElement },
        valueString: dv.value,
      }));

      patients.push({
        patient_id: hash,
        age_months: Number.isFinite(ageMonths) ? ageMonths : 0,
        gender: "O",
        observations,
        conditions: [] as FHIRCondition[],
        encounters: [] as FHIREncounter[],
      });
    }

    return patients;
  }

  private async hashId(value: string): Promise<string> {
    if (typeof crypto !== "undefined" && "subtle" in crypto) {
      const data = new TextEncoder().encode(value);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const bytes = new Uint8Array(hashBuffer);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 16);
    }
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 16);
  }
}

