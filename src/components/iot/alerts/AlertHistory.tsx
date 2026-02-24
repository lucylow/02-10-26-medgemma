import React from "react";
import { useIoTContext } from "@/components/iot/IoTProvider";
import type { VitalAlert } from "@/types/iot";
import { formatDuration, getUnit } from "./AlertCenter";

export const AlertHistory: React.FC = () => {
  const { state } = useIoTContext();
  const alerts = state.alerts;

  if (!alerts.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">
        Alert History
      </h3>
      <div className="max-h-48 space-y-1 overflow-y-auto text-xs">
        {alerts.map((alert: VitalAlert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="font-medium">
                {alert.type.toUpperCase()} • {String(alert.vital)}
              </span>
              <span className="text-[11px] text-slate-500">
                {new Date(alert.timestamp).toLocaleTimeString()} •{" "}
                {formatDuration(alert.duration)}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-600">
              <div>
                {alert.currentValue} {getUnit(alert.vital)}
              </div>
              <div className="text-slate-400">
                {alert.acknowledged ? "Acknowledged" : "Unacknowledged"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

