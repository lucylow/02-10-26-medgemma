import { motion } from "framer-motion";
import type { MockIoTDevice } from "@/types/iot";

interface FirmwareManagerProps {
  devices: MockIoTDevice[];
}

export function FirmwareManager({ devices }: FirmwareManagerProps) {
  const updatable = devices.filter((d) => d.status !== "offline");

  return (
    <motion.div
      className="rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Firmware update queue
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Simulated OTA rollouts for hubs, bands, and cameras. Safe to demo
            without hitting real hardware.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-50 shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Run all
        </button>
      </div>

      {updatable.length === 0 ? (
        <p className="rounded-2xl bg-slate-50/80 p-3 text-[11px] text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
          No online devices are eligible for updates right now.
        </p>
      ) : (
        <ul className="space-y-2 text-[11px]">
          {updatable.map((device, index) => {
            const progress = 30 + (index * 15) % 60;
            return (
              <li
                key={device.id}
                className="rounded-2xl bg-slate-50/80 p-2.5 text-slate-700 shadow-inner shadow-white/70 dark:bg-slate-900/70 dark:text-slate-200"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium">{device.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    v{device.firmwareVersion} → v1.3.0
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {progress}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

export default FirmwareManager;

