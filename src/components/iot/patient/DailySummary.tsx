import React from "react";
import { useVitalSigns } from "@/components/iot/hooks/useVitalSigns";

export const DailySummary: React.FC = () => {
  const { history } = useVitalSigns();

  if (!history.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-xs text-slate-500">
        No streaming data yet for today. Once the device is worn, a daily
        summary of vitals and activity will appear here.
      </div>
    );
  }

  const last = history[history.length - 1];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">
        Daily Summary (Last reading)
      </h3>
      <p className="text-xs text-slate-600">
        Last update at{" "}
        {new Date(last.timestamp).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
        . Heart rate {last.heartRate} bpm, respiratory rate{" "}
        {last.respiratoryRate} br/min, SpO₂ {last.oxygenSaturation}%, temp{" "}
        {last.bodyTemperature.toFixed(1)} °C.
      </p>
    </div>
  );
};

