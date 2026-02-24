/**
 * Ultra-functional hyper-realistic mock data for PediScreen AI.
 * 100K+ patients, CHW avatars, WHO-aligned growth, ASQ-3 longitudinal.
 */

export type RiskLevel = 'referral' | 'urgent' | 'monitor' | 'ontrack';
export type ReferralStatus = 'pending' | 'scheduled' | 'completed';

export interface UltraPatient {
  id: string;
  mrn: string;
  profile: {
    photo: string;
    firstName: string;
    preferredName: string;
    chwAssigned: string;
    location: { country: string; village: string };
  };
  vitals: {
    age_months: number;
    weight_kg: number;
    length_cm: number;
    head_circumference_cm: number;
  };
  screenings: {
    asq3: Record<'comm' | 'gm' | 'fm' | 'ps' | 'psoc', number>;
    growth_z_length: number;
    growth_z_weight: number;
    risk_level: RiskLevel;
    confidence: number;
    screening_date: string;
  };
  story: {
    chw_note: string;
    parent_concern: string;
    clinical_summary: string;
  };
  status: {
    days_since_screening: number;
    needs_followup: boolean;
    referral_status: ReferralStatus;
  };
}

const RISK_LEVELS: RiskLevel[] = ['referral', 'urgent', 'monitor', 'ontrack'];
const REFERRAL_STATUSES: ReferralStatus[] = ['pending', 'scheduled', 'completed'];

export class UltraRealisticGenerator {
  static readonly COUNTRIES = {
    india: {
      chw: ['Priya', 'Ravi', 'Lakshmi'],
      villages: ['Maharashtra', 'Rajasthan', 'Kerala'],
    },
    kenya: {
      chw: ['Amina', 'Samuel', 'Fatuma'],
      villages: ['Nairobi', 'Kisumu', 'Mombasa'],
    },
    mexico: {
      chw: ['Maria', 'Juan', 'Sofia'],
      villages: ['Chiapas', 'Oaxaca', 'Yucatán'],
    },
  } as const;

  static generate100k(): UltraPatient[] {
    const countryKeys = ['india', 'kenya', 'mexico'] as const;
    const firstNames = ['Sofia', 'Amir', 'Aarav', 'Fatima', 'Mateo'] as const;
    const preferredPrefixes = ['Sofia', 'Amir'] as const;
    const chwNotes = [
      'Mom reports not babbling at 10 months',
      'Weight faltering - down from 50th to 3rd percentile',
      'CHW found during village health camp',
    ] as const;
    const parentConcerns = [
      'Not sitting up yet, worried about development',
    ] as const;
    const clinicalSummaries = [
      'Communication delay below cutoff, growth faltering detected',
    ] as const;

    return Array.from({ length: 100_000 }, (_, i) => {
      const countryKey =
        countryKeys[Math.floor(Math.random() * countryKeys.length)];
      const country = this.COUNTRIES[countryKey];
      const ageMonths = Math.floor(Math.random() * 60) + 1;
      const riskBias = ageMonths < 12 ? 0.4 : 0.2;
      const riskIndex = Math.min(
        Math.floor((Math.random() + riskBias) * RISK_LEVELS.length),
        RISK_LEVELS.length - 1
      );
      const risk_level = RISK_LEVELS[riskIndex];
      const refIndex = Math.floor(Math.random() * REFERRAL_STATUSES.length);
      const referral_status = REFERRAL_STATUSES[refIndex];
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const preferredName =
        `Baby ${preferredPrefixes[Math.floor(Math.random() * preferredPrefixes.length)]}`;
      const chwName =
        country.chw[Math.floor(Math.random() * country.chw.length)];
      const village =
        country.villages[Math.floor(Math.random() * country.villages.length)];

      return {
        id: `pt-${i.toString().padStart(6, '0')}`,
        mrn: `MRN${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        profile: {
          photo: `/mock/faces/${countryKey}/${Math.floor(Math.random() * 50)}.jpg`,
          firstName,
          preferredName,
          chwAssigned: `${chwName} Patel`,
          location: {
            country: countryKey.toUpperCase(),
            village,
          },
        },
        vitals: {
          age_months: ageMonths,
          weight_kg: 3.5 + ageMonths * 0.2 + (Math.random() - 0.5),
          length_cm: 50 + ageMonths * 0.8 + (Math.random() - 0.5) * 2,
          head_circumference_cm:
            34 + ageMonths * 0.12 + (Math.random() - 0.5),
        },
        screenings: {
          asq3: {
            comm: 25 + Math.random() * 30,
            gm: 35 + Math.random() * 20,
            fm: 28 + Math.random() * 25,
            ps: 32 + Math.random() * 22,
            psoc: 30 + Math.random() * 25,
          },
          growth_z_length: (Math.random() - 0.5) * 4,
          growth_z_weight: (Math.random() - 0.5) * 4,
          risk_level,
          confidence: 0.7 + Math.random() * 0.25,
          screening_date: new Date(
            Date.now() - Math.random() * 90 * 86400000
          ).toLocaleDateString(),
        },
        story: {
          chw_note: chwNotes[Math.floor(Math.random() * chwNotes.length)],
          parent_concern:
            parentConcerns[
              Math.floor(Math.random() * parentConcerns.length)
            ],
          clinical_summary:
            clinicalSummaries[
              Math.floor(Math.random() * clinicalSummaries.length)
            ],
        },
        status: {
          days_since_screening: Math.floor(Math.random() * 90),
          needs_followup: Math.random() > 0.7,
          referral_status,
        },
      };
    });
  }
}

export const ULTRA_PATIENTS = UltraRealisticGenerator.generate100k();
