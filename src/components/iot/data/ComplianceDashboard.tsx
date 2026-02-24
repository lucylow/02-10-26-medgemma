import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { PatientMockDataBundle } from "@/types/iot";

interface ComplianceDashboardProps {
  patients: PatientMockDataBundle[];
}

export function ComplianceDashboard({ patients }: ComplianceDashboardProps) {
  const data = patients.map((bundle) => {
    const lastWeek = bundle.compliance;
    const total = lastWeek.length || 1;
    const completed = lastWeek.filter((e) => e.completed).length;
    const percent = Math.round((completed / total) * 100);
    return {
      id: bundle.patient.id,
      name: bundle.patient.displayName,
      percent,
    };
  });

  if (!data.length) return null;

  return (
    <div className="rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <h3 className="mb-1 text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Weekly adherence
      </h3>
      <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
        Medication, therapy, and device‑wear adherence over the past 7 days for
        each child.
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 12,
                borderColor: "#e5e7eb",
              }}
            />
            <Bar dataKey="percent" fill="#22c55e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ComplianceDashboard;

