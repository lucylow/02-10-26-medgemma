import { motion } from "framer-motion";
import type { MockIoTDevice } from "@/types/iot";

interface DeviceFleetProps {
  devices: MockIoTDevice[];
}

export function DeviceFleet({ devices }: DeviceFleetProps) {
  if (!devices.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-4 text-xs text-slate-500 shadow-inner shadow-white/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400">
        No IoT devices are registered yet. Once Pi5 hubs, bands, and cameras are
        paired, they will appear here for fleet‑level monitoring.
      </div>
    );
  }

  const byKind: Record<string, MockIoTDevice[]> = {};
  devices.forEach((d) => {
    byKind[d.kind] = byKind[d.kind] ? [...byKind[d.kind], d] : [d];
  });

  const sections = Object.entries(byKind);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Device fleet overview
        </h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Edge hubs, wearables, and nursery cameras with status, firmware, and
          latency at a glance.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sections.map(([kind, list], idx) => (
          <motion.div
            key={kind}
            className="rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">
                {kind === "pi5"
                  ? "Pi5 edge servers"
                  : kind === "wearable"
                    ? "Wearables"
                    : kind === "camera"
                      ? "Cameras"
                      : "Devices"}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                {list.length} online / configured
              </span>
            </div>
            <div className="space-y-2 text-[11px]">
              {list.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-2.5 py-1.5 text-slate-700 shadow-inner shadow-white/60 dark:bg-slate-900/70 dark:text-slate-200"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium">
                      {device.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {device.model}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      FW {device.firmwareVersion}
                    </span>
                    {device.cpuLoad != null && (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-50 dark:bg-slate-50 dark:text-slate-900">
                        {Math.round(device.cpuLoad)}% CPU
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default DeviceFleet;

