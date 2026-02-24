import React from "react";
import { useVitalSigns } from "@/components/iot/hooks/useVitalSigns";

export const ActivityWidget: React.FC = () => {
  const { current } = useVitalSigns();
  const activity = current?.activityLevel ?? "resting";

  const labelMap: Record<string, string> = {
    resting: "Resting",
    light: "Light Activity",
    moderate: "Moderate",
    vigorous: "Vigorous",
    sleep: "Sleep",
  };

  const colorMap: Record<string, string> = {
    resting: "bg-sky-100 text-sky-700",
    light: "bg-emerald-100 text-emerald-700",
    moderate: "bg-amber-100 text-amber-700",
    vigorous: "bg-red-100 text-red-700",
    sleep: "bg-indigo-100 text-indigo-700",
  };

  const color = colorMap[activity] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Activity Level
      </span>
      <div
        className={`mt-2 inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${color}`}
      >
        {labelMap[activity] ?? "Unknown"}
      </div>
      <span className="mt-1 text-[11px] text-slate-400">
        Based on wearable motion and heart rate trends.
      </span>
    </div>
  );
};

