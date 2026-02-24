import React from "react";
import { useDeviceManager } from "@/components/iot/hooks/useDeviceManager";
import { DeviceCard } from "./DeviceCard";

export const DeviceList: React.FC = () => {
  const { devices } = useDeviceManager();

  if (!devices.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
        No IoT devices connected yet. Pair a wearable, bedside monitor, or
        smart patch to begin remote monitoring.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} />
      ))}
    </div>
  );
};

