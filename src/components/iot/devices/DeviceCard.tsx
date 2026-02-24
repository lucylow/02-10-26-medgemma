import React from "react";
import type { IoTDevice } from "@/types/iot";

interface DeviceCardProps {
  device: IoTDevice;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const statusColor =
    device.connectionStatus === "connected"
      ? "bg-emerald-500"
      : device.connectionStatus === "connecting"
        ? "bg-amber-500"
        : device.connectionStatus === "error"
          ? "bg-red-500"
          : "bg-gray-300";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
          <p className="text-sm font-semibold text-slate-900">{device.name}</p>
        </div>
        <p className="text-xs text-slate-500">
          {device.model} • {device.type}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Last seen: {new Date(device.lastSeen).toLocaleTimeString()}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span className="font-medium">Battery</span>
          <span>{Math.round(device.batteryLevel)}%</span>
        </div>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.max(0, Math.min(100, device.batteryLevel))}%` }}
          />
        </div>
      </div>
    </div>
  );
};

