// src/components/iot/WebSocketStatus.tsx
import { Wifi, WifiOff } from "lucide-react";

interface WebSocketStatusProps {
  isConnected: boolean;
  label?: string;
}

export function WebSocketStatus({ isConnected, label }: WebSocketStatusProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium ${
        isConnected
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
      }`}
    >
      {isConnected ? (
        <Wifi className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <WifiOff className="h-3.5 w-3.5 text-slate-400" />
      )}
      <span>{label ?? (isConnected ? "Live WebSocket" : "Offline")}</span>
    </div>
  );
}

export default WebSocketStatus;

