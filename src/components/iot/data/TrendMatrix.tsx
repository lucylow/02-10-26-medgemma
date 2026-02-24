import { motion } from "framer-motion";
import type { PatientMockDataBundle } from "@/types/iot";

interface TrendMatrixProps {
  patients: PatientMockDataBundle[];
}

export function TrendMatrix({ patients }: TrendMatrixProps) {
  if (!patients.length) return null;

  const rows = patients.map((bundle) => {
    const lastDay = bundle.vitals7d.slice(-24); // last 24 hours
    const avgHr =
      lastDay.reduce((acc, v) => acc + v.heartRate, 0) /
      (lastDay.length || 1);
    const avgSpo2 =
      lastDay.reduce((acc, v) => acc + v.oxygenSaturation, 0) /
      (lastDay.length || 1);
    const feverEvents = lastDay.filter((v) => v.bodyTemperature > 38.5).length;
    const alertCount = bundle.alerts.length;

    return {
      id: bundle.patient.id,
      name: bundle.patient.displayName,
      avgHr,
      avgSpo2,
      feverEvents,
      alertCount,
    };
  });

  return (
    <motion.div
      className="rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="mb-1 text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Multi‑patient trend matrix
      </h3>
      <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
        Compare heart rate, oxygen, and febrile episodes across children to see
        who is drifting outside their usual pattern.
      </p>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 text-[11px] dark:border-slate-800 dark:bg-slate-950/60">
        <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-100/60 px-2 py-1.5 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          <span>Child</span>
          <span className="text-right">Avg HR (24h)</span>
          <span className="text-right">Avg SpO₂ (24h)</span>
          <span className="text-right">Alerts (7d)</span>
        </div>
        <div>
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className={`grid grid-cols-4 px-2 py-1.5 text-slate-700 last:border-b-0 dark:text-slate-200 ${
                idx % 2 === 0
                  ? "bg-white/70 dark:bg-slate-900/40"
                  : "bg-slate-50/60 dark:bg-slate-900/20"
              }`}
            >
              <span className="truncate font-medium">{row.name}</span>
              <span className="text-right">
                {Math.round(row.avgHr)}
                <span className="ml-0.5 text-[10px] text-slate-400">bpm</span>
              </span>
              <span className="text-right">
                {row.avgSpo2.toFixed(1)}
                <span className="ml-0.5 text-[10px] text-slate-400">%</span>
              </span>
              <span className="text-right">
                {row.alertCount}
                {row.feverEvents > 0 && (
                  <span className="ml-1 inline-flex items-center rounded-full bg-rose-100 px-1 text-[9px] text-rose-700 dark:bg-rose-900/40 dark:text-rose-100">
                    {row.feverEvents} fever
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default TrendMatrix;

