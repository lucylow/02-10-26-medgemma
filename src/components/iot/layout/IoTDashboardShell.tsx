import { motion } from "framer-motion";
import type { MockIoTDevice, PatientMockDataBundle } from "@/types/iot";
import { AlertCenter } from "@/components/iot/alerts/AlertCenter";
import { DeviceSidebar } from "./DeviceSidebar";
import { PairingModal } from "./PairingModal";

interface IoTDashboardShellProps {
  patients: PatientMockDataBundle[];
  devices: MockIoTDevice[];
  loading?: boolean;
  complianceRate: number;
  onSelectPatient?: (patientId: string) => void;
  children: React.ReactNode;
}

export function IoTDashboardShell({
  patients,
  devices,
  loading,
  complianceRate,
  onSelectPatient,
  children,
}: IoTDashboardShellProps) {
  const totalPatients = patients.length;
  const onlineDevices = devices.filter((d) => d.status === "online").length;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-indigo-50 text-slate-900 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <DeviceSidebar
        patients={patients}
        devices={devices}
        loading={loading}
        onSelectPatient={(id) => {
          onSelectPatient?.(id);
        }}
      />

      <div className="relative flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/40 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                <span className="text-sm font-semibold text-white">IoT</span>
              </motion.div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-base">
                  PediScreen Remote Monitoring
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                  Live pediatric vitals, device health, and caregiver-ready views.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-1.5 text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/80 dark:text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]" />
                <span className="font-medium">{totalPatients}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  children monitored
                </span>
              </div>
              <div className="hidden items-center gap-2 rounded-2xl bg-white/70 px-3 py-1.5 text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/80 dark:text-slate-200 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(56,189,248,0.35)]" />
                <span className="font-medium">{onlineDevices}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  devices online
                </span>
              </div>
              <div className="hidden items-center gap-2 rounded-2xl bg-emerald-50/80 px-3 py-1.5 text-emerald-700 shadow-sm backdrop-blur dark:bg-emerald-900/40 dark:text-emerald-100 md:flex">
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  {complianceRate}%
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-200">
                  weekly adherence
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-hidden">
          <motion.div
            className="h-full w-full overflow-y-auto px-4 pb-24 pt-4 sm:px-6 lg:px-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>

          <div className="pointer-events-none fixed bottom-4 right-4 z-30 w-full max-w-xs">
            <AlertCenter />
          </div>
        </main>

        <PairingModal />
      </div>
    </div>
  );
}

export default IoTDashboardShell;

