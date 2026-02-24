import React from "react";
import { useVitalSigns } from "@/components/iot/hooks/useVitalSigns";
import { getVitalRangeForAge } from "@/components/iot/vitals/PediatricVitalRanges";

export const TemperatureWidget: React.FC = () => {
  const { current, ageMonths } = useVitalSigns();
  const range = getVitalRangeForAge(ageMonths, "bodyTemperature");

  const value = current?.bodyTemperature;
  const formatted =
    value == null || Number.isNaN(value) ? "—" : value.toFixed(1);

  const status =
    value != null && range
      ? value < range.min || value > range.max
        ? "text-red-600"
        : "text-emerald-600"
      : "text-slate-500";

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Temperature
      </span>
      <div className={`mt-1 text-2xl font-bold ${status}`}>
        {formatted}
        <span className="ml-1 text-xs text-slate-500">°C</span>
      </div>
      {range && (
        <span className="mt-1 text-[11px] text-slate-400">
          Range {range.min.toFixed(1)}–{range.max.toFixed(1)} °C
        </span>
      )}
    </div>
  );
};

