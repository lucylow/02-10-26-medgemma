import { motion } from "framer-motion";
import type { MockIoTDevice, PatientMockDataBundle } from "@/types/iot";

interface DeviceSidebarProps {
  patients: PatientMockDataBundle[];
  devices: MockIoTDevice[];
  loading?: boolean;
  onSelectPatient?: (patientId: string) => void;
}

export function DeviceSidebar({
  patients,
  devices,
  loading,
  onSelectPatient,
}: DeviceSidebarProps) {
  const online = devices.filter((d) => d.status === "online").length;
  const warning = devices.filter((d) => d.status === "warning").length;
  const offline = devices.filter((d) => d.status === "offline").length;

  return (
    <aside className="hidden w-72 flex-none border-r border-white/40 bg-white/80 px-3 py-4 backdrop-blur-xl shadow-xl shadow-sky-900/5 dark:border-slate-800 dark:bg-slate-950/80 lg:block">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Devices
        </h2>
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/60 dark:text-sky-200">
          {devices.length} total
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              className="h-14 animate-pulse rounded-2xl bg-slate-100/80 dark:bg-slate-800/70"
            />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No IoT devices are paired yet. Use the pairing button on the main
          dashboard to connect a wearable, bedside monitor, or nursery camera.
        </p>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => {
            const statusColor =
              device.status === "online"
                ? "bg-emerald-500"
                : device.status === "warning"
                  ? "bg-amber-500"
                  : device.status === "updating"
                    ? "bg-sky-500"
                    : "bg-slate-400";

            return (
              <motion.button
                key={device.id}
                type="button"
                className="group flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white/80 px-3 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-sky-700 dark:hover:bg-slate-900"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                aria-label={`${device.name} status ${device.status}`}
              >
                <div className="flex flex-1 items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusColor} shadow-[0_0_0_4px_rgba(148,163,184,0.22)]`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                      {device.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {device.model} • {device.type}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 pl-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {Math.round(device.batteryLevel)}%
                  </span>
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 group-hover:bg-emerald-400"
                      style={{
                        width: `${Math.max(
                          4,
                          Math.min(100, device.batteryLevel),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="mt-5 space-y-2 rounded-2xl bg-slate-50/80 p-3 text-[10px] text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
          <span className="font-semibold">{online}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Warning
          </span>
          <span className="font-semibold">{warning}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Offline
          </span>
          <span className="font-semibold">{offline}</span>
        </div>
      </div>

      {patients.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Children
          </h3>
          <div className="space-y-1.5">
            {patients.map((bundle) => (
              <button
                key={bundle.patient.id}
                type="button"
                onClick={() => onSelectPatient?.(bundle.patient.id)}
                className="flex w-full items-center justify-between rounded-2xl bg-white/80 px-3 py-1.5 text-left text-[11px] text-slate-700 shadow-sm transition hover:bg-sky-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span className="truncate font-medium">
                  {bundle.patient.displayName}
                </span>
                <span className="ml-2 text-[10px] text-slate-400 dark:text-slate-500">
                  {Math.round(bundle.patient.ageMonths / 12)}y
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

export default DeviceSidebar;

