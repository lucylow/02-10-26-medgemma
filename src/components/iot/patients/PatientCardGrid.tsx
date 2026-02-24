import { motion } from "framer-motion";
import type { PatientMockDataBundle, VitalAlert } from "@/types/iot";
import { PatientCard } from "./PatientCard";

interface PatientCardGridProps {
  patients: PatientMockDataBundle[];
  alertsByPatient: Record<string, VitalAlert[]>;
  loading?: boolean;
}

export function PatientCardGrid({
  patients,
  alertsByPatient,
  loading,
}: PatientCardGridProps) {
  if (loading && patients.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-40 animate-pulse rounded-3xl bg-white/60 shadow-inner shadow-white/50 dark:bg-slate-900/70"
          />
        ))}
      </div>
    );
  }

  if (!patients.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-xs text-slate-500 shadow-inner shadow-white/60 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-100">
          No children are enrolled in IoT monitoring yet.
        </p>
        <p className="mt-1 max-w-md text-[11px]">
          Use the pairing button below to connect the first wearable or camera,
          then link it to a PediScreen child profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            At-a-glance monitoring
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Up to nine children per view, prioritizing critical alerts for
            faster triage in the field.
          </p>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.04,
            },
          },
        }}
      >
        {patients.slice(0, 9).map((bundle) => (
          <motion.div
            key={bundle.patient.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <PatientCard
              bundle={bundle}
              alerts={alertsByPatient[bundle.patient.id] ?? []}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default PatientCardGrid;

