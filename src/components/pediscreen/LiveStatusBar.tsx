/**
 * LiveStatusBar — Real-time HITL connection status for clinician dashboard
 */
import React from "react";
import { Wifi, WifiOff, Users, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LiveStatusBarProps {
  isConnected: boolean;
  pendingCases: number;
  queuePosition: number;
  activeClinicians: number;
  heartbeat: number;
  className?: string;
}

const HEALTH_THRESHOLD_MS = 60000;

export function LiveStatusBar({
  isConnected,
  pendingCases,
  queuePosition,
  activeClinicians,
  heartbeat,
  className,
}: LiveStatusBarProps) {
  const isHealthy = Date.now() - heartbeat < HEALTH_THRESHOLD_MS;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-6 h-14 rounded-t-lg transition-colors",
        isConnected ? "bg-emerald-600" : "bg-destructive",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {isConnected ? (
          <Wifi className="w-5 h-5 text-white" />
        ) : (
          <WifiOff className="w-5 h-5 text-white" />
        )}
        <span className="font-semibold text-white text-base">
          {isConnected ? `Live (${pendingCases} pending)` : "Disconnected"}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-sm font-medium">
          #{queuePosition || "—"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-white/90 text-sm flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          {activeClinicians} online
        </span>
        <Activity
          className={cn(
            "w-4 h-4 transition-colors",
            isHealthy ? "text-emerald-300" : "text-amber-300",
            isConnected && "animate-pulse"
          )}
        />
      </div>
    </div>
  );
}
