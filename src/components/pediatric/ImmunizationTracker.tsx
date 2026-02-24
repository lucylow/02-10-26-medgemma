"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Age string to weeks (approximate). Handles "Birth", "6 weeks", "2 months", "12 months", etc. */
function parseAgeToWeeks(ageStr: string): number {
  const s = ageStr.toLowerCase().trim();
  if (s === "birth") return 0;
  const weeksMatch = s.match(/(\d+)\s*weeks?/);
  if (weeksMatch) return parseInt(weeksMatch[1], 10);
  const monthsMatch = s.match(/(\d+)\s*months?/);
  if (monthsMatch) return parseInt(monthsMatch[1], 10) * (52 / 12);
  const yearsMatch = s.match(/(\d+)\s*years?/);
  if (yearsMatch) return parseInt(yearsMatch[1], 10) * 52;
  return 0;
}

export type ScheduleId =
  | "WHO_EPI"
  | "CDC_US"
  | "India_UIP"
  | "UK"
  | "Canada"
  | "Australia"
  | "Brazil"
  | "SouthAfrica"
  | "Nigeria"
  | "Kenya"
  | "Pakistan"
  | "Indonesia";

const IMMUNIZATION_SCHEDULES: Record<
  ScheduleId,
  { name: string; entries: Record<string, string[]> }
> = {
  WHO_EPI: {
    name: "WHO EPI",
    entries: {
      "Birth": ["BCG", "HepB0", "OPV0"],
      "6 weeks": ["OPV1", "DTP1", "HepB1", "Hib1", "PCV1", "RV1"],
      "10 weeks": ["OPV2", "DTP2", "HepB2", "Hib2", "PCV2", "RV2"],
      "14 weeks": ["OPV3", "DTP3", "HepB3", "Hib3", "PCV3", "RV3"],
      "9 months": ["Measles1", "Yellow fever*", "MenA*"],
      "15–18 months": ["Measles2", "DTP booster", "OPV booster"],
      "4–7 years": ["DT booster", "OPV*"],
    },
  },
  CDC_US: {
    name: "CDC (US)",
    entries: {
      "Birth": ["HepB1"],
      "2 months": ["DTaP1", "Hib1", "IPV1", "PCV1", "RV1"],
      "4 months": ["DTaP2", "Hib2", "IPV2", "PCV2", "RV2"],
      "6 months": ["DTaP3", "Hib3", "IPV3", "PCV3", "RV3", "HepB3", "Flu*"],
      "12 months": ["MMR1", "Varicella1", "HepA1", "Hib4", "PCV4"],
      "15 months": ["DTaP4"],
      "18 months": ["HepA2"],
      "4–6 years": ["DTaP5", "IPV4", "MMR2", "Varicella2"],
      "11–12 years": ["Tdap", "HPV", "MenACWY"],
    },
  },
  India_UIP: {
    name: "India UIP",
    entries: {
      "Birth": ["BCG", "HepB0", "OPV0"],
      "6 weeks": ["OPV1", "DPT1", "HepB1", "Hib1", "PCV1", "RV1", "IPV1"],
      "10 weeks": ["OPV2", "DPT2", "HepB2", "Hib2", "PCV2", "RV2", "IPV2"],
      "14 weeks": ["OPV3", "DPT3", "HepB3", "Hib3", "PCV3", "RV3", "IPV3"],
      "9 months": ["Measles1", "MMR1", "JE1*"],
      "15–18 months": ["DPT booster", "OPV booster", "Measles2", "MMR2", "JE2*"],
      "5–6 years": ["DT booster", "OPV*"],
      "10 years": ["Td"],
      "16 years": ["Td"],
    },
  },
  UK: {
    name: "UK",
    entries: {
      "8 weeks": ["DTaP1", "Hib1", "IPV1", "PCV1", "MenB1", "RV1"],
      "12 weeks": ["DTaP2", "Hib2", "IPV2", "PCV2", "MenB2", "RV2"],
      "16 weeks": ["DTaP3", "Hib3", "IPV3", "PCV3", "MenB3", "RV3"],
      "12 months": ["Hib/MenC", "MMR1", "PCV4", "MenB booster"],
      "3 years 4 months": ["DTaP/IPV preschool"],
      "12–13 years": ["HPV", "Td/IPV"],
      "14 years": ["MenACWY"],
    },
  },
  Canada: {
    name: "Canada",
    entries: {
      "2 months": ["DTaP1", "Hib1", "IPV1", "PCV1", "RV1"],
      "4 months": ["DTaP2", "Hib2", "IPV2", "PCV2", "RV2"],
      "6 months": ["DTaP3", "Hib3", "IPV3", "PCV3", "RV3", "Flu*"],
      "12 months": ["MMR1", "Varicella1", "Hib4", "PCV4", "MenC"],
      "18 months": ["DTaP4", "MMR2", "Varicella2"],
      "4–6 years": ["DTaP5", "IPV4"],
      "Grade 7": ["HPV", "Tdap", "HepB*"],
      "Grade 9": ["MenACWY"],
    },
  },
  Australia: {
    name: "Australia",
    entries: {
      "Birth": ["HepB1"],
      "2 months": ["DTaP1", "Hib1", "IPV1", "PCV1", "RV1", "HepB2"],
      "4 months": ["DTaP2", "Hib2", "IPV2", "PCV2", "RV2"],
      "6 months": ["DTaP3", "Hib3", "IPV3", "PCV3", "RV3", "HepB3"],
      "12 months": ["MMR1", "MenACWY", "Hib4", "PCV4"],
      "18 months": ["MMR2", "Varicella1"],
      "4 years": ["DTaP4", "IPV4"],
      "12–13 years": ["HPV", "Tdap", "Varicella2*"],
    },
  },
  Brazil: {
    name: "Brazil",
    entries: {
      "Birth": ["BCG", "HepB1"],
      "2 months": ["DTaP1", "Hib1", "IPV1", "PCV1", "RV1"],
      "4 months": ["DTaP2", "Hib2", "IPV2", "PCV2", "RV2"],
      "6 months": ["DTaP3", "Hib3", "IPV3", "PCV3", "RV3", "HepB3"],
      "9 months": ["Yellow fever1"],
      "12 months": ["MMR1", "PCV booster", "HepA1"],
      "15 months": ["DTaP booster", "Varicella1", "HepA2"],
      "4 years": ["DTaP booster", "IPV booster"],
      "9 years": ["HPV*"],
    },
  },
  SouthAfrica: {
    name: "South Africa",
    entries: {
      "Birth": ["BCG", "OPV0"],
      "6 weeks": ["OPV1", "DTaP1", "Hib1", "HepB1", "PCV1", "RV1"],
      "10 weeks": ["OPV2", "DTaP2", "Hib2", "HepB2", "PCV2", "RV2"],
      "14 weeks": ["OPV3", "DTaP3", "Hib3", "HepB3", "PCV3", "RV3"],
      "9 months": ["Measles1"],
      "18 months": ["Measles2", "DTaP booster"],
      "6 years": ["Td", "OPV*"],
      "12 years": ["HPV*"],
    },
  },
  Nigeria: {
    name: "Nigeria",
    entries: {
      "Birth": ["BCG", "OPV0", "HepB0"],
      "6 weeks": ["OPV1", "DPT1", "HepB1", "Hib1", "PCV1", "RV1"],
      "10 weeks": ["OPV2", "DPT2", "HepB2", "Hib2", "PCV2", "RV2"],
      "14 weeks": ["OPV3", "DPT3", "HepB3", "Hib3", "PCV3", "RV3"],
      "9 months": ["Measles1", "Yellow fever1"],
      "15 months": ["Measles2", "MenA*"],
    },
  },
  Kenya: {
    name: "Kenya",
    entries: {
      "Birth": ["BCG", "OPV0"],
      "6 weeks": ["OPV1", "DPT1", "HepB1", "Hib1", "PCV1", "RV1"],
      "10 weeks": ["OPV2", "DPT2", "HepB2", "Hib2", "PCV2", "RV2"],
      "14 weeks": ["OPV3", "DPT3", "HepB3", "Hib3", "PCV3", "RV3"],
      "9 months": ["Measles1", "Yellow fever1"],
      "18 months": ["Measles2", "DPT booster", "OPV booster"],
    },
  },
  Pakistan: {
    name: "Pakistan",
    entries: {
      "Birth": ["BCG", "OPV0", "HepB0"],
      "6 weeks": ["OPV1", "DPT1", "HepB1", "Hib1", "PCV1", "RV1"],
      "10 weeks": ["OPV2", "DPT2", "HepB2", "Hib2", "PCV2", "RV2"],
      "14 weeks": ["OPV3", "DPT3", "HepB3", "Hib3", "PCV3", "RV3", "IPV"],
      "9 months": ["Measles1"],
      "15 months": ["Measles2", "DPT booster", "OPV booster"],
      "4–5 years": ["DT booster"],
    },
  },
  Indonesia: {
    name: "Indonesia",
    entries: {
      "Birth": ["HepB0", "Polio0"],
      "2 months": ["DPT1", "HepB1", "Polio1", "Hib1", "PCV1", "RV1"],
      "3 months": ["DPT2", "HepB2", "Polio2", "Hib2", "PCV2", "RV2"],
      "4 months": ["DPT3", "HepB3", "Polio3", "Hib3", "PCV3", "RV3", "IPV"],
      "9 months": ["Measles1"],
      "18 months": ["Measles2", "DPT booster", "Polio booster"],
    },
  },
};

const SCHEDULE_IDS = Object.keys(IMMUNIZATION_SCHEDULES) as ScheduleId[];

interface ImmunizationTrackerProps {
  country?: ScheduleId;
  className?: string;
}

export function ImmunizationTracker({ country = "WHO_EPI", className }: ImmunizationTrackerProps) {
  const [childAgeWeeks, setChildAgeWeeks] = useState(12);
  const [vaccinesGiven, setVaccinesGiven] = useState<Record<string, boolean>>({});
  const [scheduleId, setScheduleId] = useState<ScheduleId>(country);

  const schedule = IMMUNIZATION_SCHEDULES[scheduleId];
  const entries = Object.entries(schedule.entries);

  const toggleGiven = (ageKey: string) => {
    setVaccinesGiven((prev) => ({ ...prev, [ageKey]: !prev[ageKey] }));
  };

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-200 dark:border-indigo-800",
        className
      )}
    >
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Immunization Status
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl font-bold text-gray-800 dark:text-gray-200 tabular-nums">
              {childAgeWeeks}w
            </span>
            <input
              type="range"
              min={0}
              max={104}
              value={childAgeWeeks}
              onChange={(e) => setChildAgeWeeks(Number(e.target.value))}
              className="w-36 sm:w-48 h-3 accent-indigo-500 rounded-full"
              aria-label="Child age in weeks"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Schedule
          </label>
          <select
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value as ScheduleId)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium"
          >
            {SCHEDULE_IDS.map((id) => (
              <option key={id} value={id}>
                {IMMUNIZATION_SCHEDULES[id].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {entries.map(([ageKey, vaccines]) => {
          const ageWeeks = parseAgeToWeeks(ageKey);
          const overdue = ageWeeks <= childAgeWeeks && !vaccinesGiven[ageKey];
          const given = vaccinesGiven[ageKey];

          return (
            <div
              key={ageKey}
              className={cn(
                "p-4 sm:p-6 rounded-2xl border-l-8 transition-all",
                overdue && "bg-red-50 dark:bg-red-950/30 border-red-500 shadow-md",
                given && !overdue && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500",
                !given && !overdue && "bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 hover:shadow-md"
              )}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-lg sm:text-xl text-gray-900 dark:text-gray-100">
                  {ageKey}
                </span>
                <button
                  type="button"
                  onClick={() => toggleGiven(ageKey)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm transition-colors",
                    given && "bg-emerald-500 hover:bg-emerald-600",
                    overdue && !given && "bg-red-500 hover:bg-red-600",
                    !given && !overdue && "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  )}
                  aria-label={given ? `Mark ${ageKey} as not given` : `Mark ${ageKey} as given`}
                >
                  {given ? "✓" : overdue ? "!" : "○"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {vaccines.map((vaccine) => (
                  <span
                    key={vaccine}
                    className="px-3 py-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full text-sm font-medium text-gray-800 dark:text-gray-200 shadow-sm"
                  >
                    {vaccine}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
