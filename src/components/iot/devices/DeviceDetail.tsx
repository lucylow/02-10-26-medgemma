import { motion } from "framer-motion";
import type { MockIoTDevice } from "@/types/iot";

interface DeviceDetailProps {
  device: MockIoTDevice;
}

export function DeviceDetail({ device }: DeviceDetailProps) {
  return (
    <motion.div
      className="rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {device.name}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {device.model} • {device.type} • {device.roomLocation}
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-50 shadow-sm dark:bg-slate-50 dark:text-slate-900">
          {Math.round(device.batteryLevel)}% battery
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
        <div className="rounded-2xl bg-slate-50/80 p-2 dark:bg-slate-900/70">
          <dt className="text-[10px] text-slate-500 dark:text-slate-400">
            MAC
          </dt>
          <dd className="font-mono text-[10px]">{device.macAddress}</dd>
        </div>
        <div className="rounded-2xl bg-slate-50/80 p-2 dark:bg-slate-900/70">
          <dt className="text-[10px] text-slate-500 dark:text-slate-400">
            Last seen
          </dt>
          <dd>
            {new Date(device.lastSeen).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </dd>
        </div>
        {device.cpuLoad != null && (
          <div className="rounded-2xl bg-slate-50/80 p-2 dark:bg-slate-900/70">
            <dt className="text-[10px] text-slate-500 dark:text-slate-400">
              CPU / Memory
            </dt>
            <dd>
              {Math.round(device.cpuLoad)}% •{" "}
              {device.memoryUsageMb ? `${Math.round(device.memoryUsageMb)} MB` : "—"}
            </dd>
          </div>
        )}
        {device.networkLatencyMs != null && (
          <div className="rounded-2xl bg-slate-50/80 p-2 dark:bg-slate-900/70">
            <dt className="text-[10px] text-slate-500 dark:text-slate-400">
              Network
            </dt>
            <dd>{Math.round(device.networkLatencyMs)} ms</dd>
          </div>
        )}
      </dl>
    </motion.div>
  );
}

export default DeviceDetail;

