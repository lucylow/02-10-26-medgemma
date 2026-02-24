import type { PediatricVitalSigns } from "@/types/iot";
import { findAgeGroupForMonths } from "@/types/iot";

export const getPediatricAgeLabel = (ageMonths: number | null | undefined) => {
  if (ageMonths == null) return "Unknown age";
  const group = findAgeGroupForMonths(ageMonths);
  return group?.ageLabel ?? `${ageMonths} months`;
};

export const getVitalRangeForAge = (
  ageMonths: number,
  vitalKey: keyof Pick<
    PediatricVitalSigns,
    "heartRate" | "respiratoryRate" | "oxygenSaturation" | "bodyTemperature"
  >,
) => {
  const group = findAgeGroupForMonths(ageMonths);
  if (!group) return undefined;

  switch (vitalKey) {
    case "heartRate":
      return group.vitalRanges.heartRate;
    case "respiratoryRate":
      return group.vitalRanges.respiratoryRate;
    case "oxygenSaturation":
      return group.vitalRanges.oxygenSaturation;
    case "bodyTemperature":
      return group.vitalRanges.temperature;
    default:
      return undefined;
  }
};

