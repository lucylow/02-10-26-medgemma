import React from "react";
import { useIoTConnection } from "@/components/iot/hooks/useIoTConnection";
import { useDeviceManager } from "@/components/iot/hooks/useDeviceManager";

export const DeviceConnectionStatus: React.FC = () => {
  const { isConnected } = useIoTConnection();
  const { connected, connecting, disconnected, error } = useDeviceManager();

  const statusLabel = isConnected ? "Live stream active" : "Connecting…";
  const pillColor = isConnected ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-xs font-medium text-white px-3 py-1 shadow-md">
        <span className={`h-2 w-2 rounded-full ${pillColor}`} />
        <span>{statusLabel}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span>{connected.length} connected</span>
        <span>• {connecting.length} connecting</span>
        <span>• {disconnected.length} offline</span>
        {error.length > 0 && (
          <span className="text-red-500">• {error.length} error</span>
        )}
      </div>
    </div>
  );
};

