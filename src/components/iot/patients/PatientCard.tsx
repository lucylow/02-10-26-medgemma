import { motion } from "framer-motion";
import type { PatientMockDataBundle, VitalAlert } from "@/types/iot";

interface PatientCardProps {
  bundle: PatientMockDataBundle;
  alerts: VitalAlert[];
  onOpenDetail?: (patientId: string) => void;
}

const severityBadgeStyles: Record<
  VitalAlert["type"],
  { bg: string; text: string; label: string }
> = {
  critical: {
    bg: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-100",
    text: "Critical",
    label: "Critical alert",
  },
  warning: {
    bg: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100",
    text: "Monitor",
    label: "Elevated alert",
  },
  info: {
    bg: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-100",
    text: "Info",
    label: "Informational alert",
  },
};

export function PatientCard({ bundle, alerts, onOpenDetail }: PatientCardProps) {
  const latestVital =
    bundle.realtimeVitals[bundle.realtimeVitals.length - 1] ??
    bundle.vitals24h[bundle.vitals24h.length - 1];

  const ageYears = bundle.patient.ageMonths / 12;

  const mostSevereAlert = alerts.reduce<VitalAlert | undefined>(
    (current, next) => {
      if (!current) return next;
      if (next.type === "critical" && current.type !== "critical") return next;
      if (next.type === "warning" && current.type === "info") return next;
      return current;
    },
    undefined,
  );

  const severityConfig =
    mostSevereAlert && severityBadgeStyles[mostSevereAlert.type];

  const lastUpdateLabel = latestVital
    ? `${Math.max(
        0,
        Math.round(
          (Date.now() - latestVital.timestamp.getTime()) / 1000,
        ),
      )}s ago`
    : "No recent data";

  const heartRate = latestVital?.heartRate ?? null;
  const spo2 = latestVital?.oxygenSaturation ?? null;
  const temperature = latestVital?.bodyTemperature ?? null;

  return (
    <motion.button
      type="button"
      onClick={() => onOpenDetail?.(bundle.patient.id)}
      className="group flex h-full flex-col justify-between rounded-3xl border border-white/60 bg-white/80 p-3 text-left shadow-lg shadow-sky-500/5 ring-1 ring-slate-100/60 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-sky-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 dark:border-slate-800/80 dark:bg-slate-950/80 dark:ring-slate-800 dark:hover:bg-slate-950"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      aria-label={`Open monitoring detail for ${bundle.patient.displayName}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-teal-400 to-emerald-400 text-xs font-semibold text-white shadow-md shadow-sky-500/40">
            {bundle.patient.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">
              {bundle.patient.displayName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {ageYears.toFixed(1)} years •{" "}
              {bundle.patient.primaryCondition ?? "Routine monitoring"}
            </p>
          </div>
        </div>

        {severityConfig && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityConfig.bg}`}
            aria-label={severityConfig.label}
          >
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
            {severityConfig.text}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-2xl bg-slate-50/80 px-2 py-1.5 text-slate-700 shadow-inner shadow-white/40 dark:bg-slate-900/70 dark:text-slate-200">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              HR
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">
              80–140 bpm
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-sm font-semibold text-rose-600 dark:text-rose-300">
              {heartRate != null ? Math.round(heartRate) : "—"}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">
              bpm
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-sky-50/80 px-2 py-1.5 text-slate-700 shadow-inner shadow-white/40 dark:bg-sky-900/40 dark:text-slate-50">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-slate-600/90 dark:text-slate-200/80">
              SpO₂
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-300">
              ≥95%
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-sm font-semibold text-sky-700 dark:text-sky-100">
              {spo2 != null ? spo2.toFixed(1) : "—"}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-300">
              %
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-50/80 px-2 py-1.5 text-slate-700 shadow-inner shadow-white/40 dark:bg-emerald-900/40 dark:text-emerald-50">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-slate-600/90 dark:text-emerald-100/90">
              Temp
            </span>
            <span className="text-[9px] text-slate-500 dark:text-emerald-100/80">
              36.5–37.8℃
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-100">
              {temperature != null ? temperature.toFixed(1) : "—"}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-emerald-100/80">
              ℃
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <span className="relative flex h-1.5 w-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <span className="animate-pulse-slow absolute inset-y-0 left-0 w-2 rounded-full bg-emerald-500/80" />
          </span>
          <span>Live</span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          Last update: {lastUpdateLabel}
        </span>
      </div>
    </motion.button>
  );
}

export default PatientCard;

