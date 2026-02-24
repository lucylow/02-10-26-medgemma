// src/components/iot/LiveDeviceTelemetry.tsx
import { motion, AnimatePresence } from "framer-motion";
import { useLiveDeviceData } from "@/hooks/useLiveDeviceData";
import type { DeviceTelemetry } from "@/hooks/useLiveDeviceData";

const DeviceCard = ({ device }: { device: DeviceTelemetry }) => {
  const getStatusColor = (status: DeviceTelemetry["status"]) => {
    if (status === "online") return "bg-emerald-500";
    if (status === "warning") return "bg-amber-500";
    return "bg-red-500";
  };

  const cpuGradient =
    "bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1 dark:bg-slate-900/80 dark:border-slate-800"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 ${getStatusColor(
              device.status,
            )} rounded-2xl flex items-center justify-center shadow-lg`}
          >
            <span className="text-white font-bold text-base">
              {device.type === "pi5"
                ? "🤖"
                : device.type === "wearable"
                  ? "⌚"
                  : device.type === "camera"
                    ? "📷"
                    : "🩸"}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base">
              {device.deviceId.slice(-8)}
            </h3>
            <p className="text-xs text-muted-foreground capitalize">
              {device.type}
            </p>
          </div>
        </div>
        <div
          className={`px-2 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 ${
            device.status === "online"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
              : device.status === "warning"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-200"
                : "bg-red-500/10 text-red-700 dark:text-red-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${getStatusColor(
              device.status,
            )}`}
          />
          <span className="capitalize">{device.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {device.cpu !== undefined && (
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
              CPU
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800">
              <motion.div
                className={cpuGradient}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(device.cpu, 100)}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-mono">{device.cpu.toFixed(0)}%</span>
          </div>
        )}

        {device.battery !== undefined && (
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Battery
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800">
              <motion.div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all"
                initial={{ width: 0 }}
                animate={{ width: `${device.battery}%` }}
              />
            </div>
            <span className="text-xs font-mono">
              {device.battery.toFixed(0)}%
            </span>
          </div>
        )}

        {device.vitals && (
          <div className="space-y-1 col-span-2">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Live vitals
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-lg text-red-500">
                  {device.vitals.heartRate}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  HR bpm
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-sky-500">
                  {device.vitals.spo2}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  SpO₂ %
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-teal-500">
                  {device.vitals.respiratoryRate}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  RR bpm
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 text-[11px] text-muted-foreground space-y-1 dark:border-slate-800">
        <div className="flex justify-between">
          <span>Inference</span>
          <span>{device.inferenceTime?.toFixed(0) ?? "—"} ms</span>
        </div>
        <div className="flex justify-between">
          <span>Queue</span>
          <span>{device.queueLength}</span>
        </div>
        <div className="flex justify-between">
          <span>Last seen</span>
          <span>{new Date(device.lastSeen).toLocaleTimeString()}</span>
        </div>
      </div>
    </motion.div>
  );
};

export function LiveDeviceTelemetry() {
  const { devices, isConnected, alerts } = useLiveDeviceData([
    "pi5-001",
    "wearable-01",
    "wearable-02",
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold bg-gradient-to-r from-sky-600 to-emerald-500 bg-clip-text text-transparent md:text-xl">
            Live edge device telemetry
          </h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            Raspberry Pi 5 hub and pediatric wearables streaming at demo
            cadence. Frontend-only mock stream unless a real WebSocket URL is
            configured.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 self-start rounded-xl px-3 py-1.5 text-xs font-medium ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
            }`}
          />
          <span>{isConnected ? "Live mock stream" : "Disconnected"}</span>
        </div>
      </div>

      <AnimatePresence>
        {alerts.slice(0, 3).map((alert) => (
          <motion.div
            key={alert.sequence}
            initial={{ opacity: 0, x: 20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.98 }}
            className="bg-red-50/80 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm dark:bg-red-900/10 dark:border-red-900/40"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-red-900 text-sm mb-1 dark:text-red-100">
                {alert.payload.title}
              </div>
              <div className="text-xs text-red-800 truncate dark:text-red-200">
                {alert.payload.message}
              </div>
              <div className="text-[11px] text-red-600 mt-1 dark:text-red-300">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((device) => (
          <DeviceCard key={device.deviceId} device={device} />
        ))}
      </div>

      {devices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 text-muted-foreground"
        >
          <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center dark:bg-slate-800">
            <span className="text-3xl">📡</span>
          </div>
          <h3 className="text-base font-semibold mb-1">
            Waiting for devices…
          </h3>
          <p className="text-xs md:text-sm">
            Mock stream will populate Raspberry Pi and wearable data within a
            few seconds.
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default LiveDeviceTelemetry;

