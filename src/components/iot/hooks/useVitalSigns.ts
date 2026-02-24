import { useMemo } from "react";
import { useIoTContext } from "@/components/iot/IoTProvider";
import { findAgeGroupForMonths } from "@/types/iot";

export const useVitalSigns = () => {
  const { state } = useIoTContext();
  const { currentVitals, vitalHistory, patientAgeMonths } = state;

  const { isNormal, abnormalKeys } = useMemo(() => {
    if (!currentVitals) {
      return { isNormal: true, abnormalKeys: [] as (keyof typeof currentVitals)[] };
    }

    const ageGroup = findAgeGroupForMonths(patientAgeMonths);
    if (!ageGroup) {
      return { isNormal: true, abnormalKeys: [] as (keyof typeof currentVitals)[] };
    }

    const outOfRange: (keyof typeof currentVitals)[] = [];

    if (
      currentVitals.heartRate < ageGroup.vitalRanges.heartRate.min ||
      currentVitals.heartRate > ageGroup.vitalRanges.heartRate.max
    ) {
      outOfRange.push("heartRate");
    }
    if (
      currentVitals.respiratoryRate <
        ageGroup.vitalRanges.respiratoryRate.min ||
      currentVitals.respiratoryRate >
        ageGroup.vitalRanges.respiratoryRate.max
    ) {
      outOfRange.push("respiratoryRate");
    }
    if (
      currentVitals.oxygenSaturation <
        ageGroup.vitalRanges.oxygenSaturation.min ||
      currentVitals.oxygenSaturation >
        ageGroup.vitalRanges.oxygenSaturation.max
    ) {
      outOfRange.push("oxygenSaturation");
    }
    if (
      currentVitals.bodyTemperature <
        ageGroup.vitalRanges.temperature.min ||
      currentVitals.bodyTemperature > ageGroup.vitalRanges.temperature.max
    ) {
      outOfRange.push("bodyTemperature");
    }

    return {
      isNormal: outOfRange.length === 0,
      abnormalKeys: outOfRange,
    };
  }, [currentVitals, patientAgeMonths]);

  return {
    current: currentVitals,
    history: vitalHistory,
    ageMonths: patientAgeMonths,
    isNormal,
    abnormalKeys,
  };
};

