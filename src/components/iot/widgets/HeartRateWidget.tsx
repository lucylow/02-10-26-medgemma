import React from "react";
import { useVitalSigns } from "@/components/iot/hooks/useVitalSigns";
import { getVitalRangeForAge } from "@/components/iot/vitals/PediatricVitalRanges";

export const HeartRateWidget: React.FC = () => {
  const { current, ageMonths } = useVitalSigns();
  const range = getVitalRangeForAge(ageMonths, "heartRate");

  const value = current?.heartRate;
  const formatted =
    value == null || Number.isNaN(value) ? "—" : value.toFixed(0);

  const status =
    value != null && range
      ? value < range.min || value > range.max
        ? "text-red-600"
        : "text-emerald-600"
      : "text-slate-500";

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Heart Rate
      </span>
      <div className={`mt-1 text-2xl font-bold ${status}`}>
        {formatted}
        <span className="ml-1 text-xs text-slate-500">bpm</span>
      </div>
      {range && (
        <span className="mt-1 text-[11px] text-slate-400">
          Range {range.min}–{range.max} bpm
        </span>
      )}
    </div>
  );
};

