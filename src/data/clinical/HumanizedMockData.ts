/**
 * Production-grade human-centered mock clinical data.
 * 50K+ realistic patients with CHW stories, risk stratification, and demographics.
 * Used for clinician/CHW UX, Storybook, and offline-first demos.
 */

export interface HumanizedPatient {
  id: string;
  mrn: string;
  name: {
    first: string;
    last: string;
    preferred: string;
  };
  demographics: {
    age_months: number;
    dob: string;
    gender: "M" | "F" | "Other";
    location: string;
  };
  clinical: {
    asq_scores: Record<string, number>;
    growth_z: { length: number; weight: number };
    risk_level: "referral" | "urgent" | "monitor" | "ontrack";
    confidence: number;
    last_screening: string;
  };
  chw: {
    assigned: string;
    contact: string;
    photo_url: string;
  };
  story: string;
}

export class HumanizedMockGenerator {
  static readonly CHW_NAMES = [
    "Maria Gonzalez",
    "Carlos Rivera",
    "Priya Sharma",
    "Amina Hassan",
    "Fatima Khalid",
    "Juan Morales",
    "Lakshmi Devi",
    "Samuel Okello",
  ];

  static readonly LOCATIONS = [
    "Rural Maharashtra, India",
    "Nairobi Slum, Kenya",
    "Chiapas Highlands, Mexico",
    "Lagos Island, Nigeria",
  ];

  static readonly STORIES = [
    "Maria's 3rd visit this month - mom worried about speech",
    "Carlos found during community screening camp",
    "Priya's regular patient - improving motor skills!",
    "Amina referred from maternal health outreach",
    "Fatima's family relocated; follow-up scheduled",
    "Juan's growth curve improving after nutrition counseling",
    "Lakshmi tracking fine motor milestones",
    "Samuel's mom requested early language screen",
  ];

  static readonly FIRST_NAMES = ["Sofia", "Amir", "Aarav", "Fatima", "Diego", "Layla", "Omar", "Zara"];
  static readonly LAST_NAMES = ["Patel", "Khan", "Garcia", "Ocampo", "Silva", "Nkrumah", "Singh", "Ibrahim"];
  static readonly PREFERRED_PREFIXES = ["Baby ", ""];

  static generateRealisticCohort(n = 50000): HumanizedPatient[] {
    const riskLevels: HumanizedPatient["clinical"]["risk_level"][] = [
      "referral",
      "urgent",
      "monitor",
      "ontrack",
    ];
    return Array.from({ length: n }, (_, i) => {
      const riskLevel =
        riskLevels[Math.floor(Math.random() * riskLevels.length)];
      const first = this.FIRST_NAMES[Math.floor(Math.random() * this.FIRST_NAMES.length)];
      const last = this.LAST_NAMES[Math.floor(Math.random() * this.LAST_NAMES.length)];
      const usePreferred = Math.random() > 0.5;
      const preferred = usePreferred
        ? `${this.PREFERRED_PREFIXES[0]}${first}`
        : first;
      return {
        id: `pt-${i.toString().padStart(6, "0")}`,
        mrn: `MRN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        name: {
          first,
          last,
          preferred,
        },
        demographics: {
          age_months: Math.floor(Math.random() * 60) + 1,
          dob: new Date(
            Date.now() -
              Math.random() * 60 * 30 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
          gender: Math.random() > 0.02 ? (Math.random() > 0.5 ? "M" : "F") : "Other",
          location:
            this.LOCATIONS[Math.floor(Math.random() * this.LOCATIONS.length)],
        },
        clinical: {
          asq_scores: {
            communication: 25 + Math.random() * 30,
            gross_motor: 35 + Math.random() * 20,
            fine_motor: 28 + Math.random() * 25,
            problem_solving: 32 + Math.random() * 22,
            personal_social: 30 + Math.random() * 25,
          },
          growth_z: {
            length: (Math.random() - 0.5) * 4,
            weight: (Math.random() - 0.5) * 4,
          },
          risk_level: riskLevel,
          confidence: 0.65 + Math.random() * 0.3,
          last_screening: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString(),
        },
        chw: {
          assigned:
            this.CHW_NAMES[Math.floor(Math.random() * this.CHW_NAMES.length)],
          contact: `+91${Math.floor(9000000000 + Math.random() * 1000000000)}`,
          photo_url: `/mock/chw/${Math.floor(Math.random() * 8)}.jpg`,
        },
        story:
          this.STORIES[Math.floor(Math.random() * this.STORIES.length)],
      };
    });
  }
}

// Lazy-init full cohort on first read (keeps app shell fast until patients page loads)
let _cohort: HumanizedPatient[] | null = null;

export function getHumanizedCohort(size = 50000): HumanizedPatient[] {
  if (!_cohort || _cohort.length !== size) {
    _cohort = HumanizedMockGenerator.generateRealisticCohort(size);
  }
  return _cohort;
}

// Pre-generated 50K for list/filters; generation runs when this module is first imported
export const HUMANIZED_PATIENTS = getHumanizedCohort(50000);

export const HIGH_RISK_PATIENTS = HUMANIZED_PATIENTS.filter(
  (p) => p.clinical.risk_level === "referral"
);
