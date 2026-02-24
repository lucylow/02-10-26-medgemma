import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import type { PatientMockDataBundle } from "@/types/iot";

interface AnomalyTimelineProps {
  patient: PatientMockDataBundle;
}

export function AnomalyTimeline({ patient }: AnomalyTimelineProps) {
  const data = patient.anomalies
    .map((event) => ({
      time: event.timestamp,
      severity:
        event.severity === "critical" ? 3 : event.severity === "warning" ? 2 : 1,
    }))
    .reverse();

  if (!data.length) return null;

  return (
    <div className="rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <h3 className="mb-1 text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Anomaly timeline
      </h3>
      <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
        ML‑flagged anomaly clusters over the last 7 days. Taller peaks indicate
        more severe or frequent events.
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="anomArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={(v: Date) =>
                new Date(v).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              }
              minTickGap={24}
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              domain={[0, 3.5]}
              tickFormatter={(v) =>
                v === 3 ? "Critical" : v === 2 ? "Warning" : "Info"
              }
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 12,
                borderColor: "#e5e7eb",
              }}
              labelFormatter={(v) =>
                new Date(v as Date).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
            <Area
              dataKey="severity"
              stroke="#f97316"
              fill="url(#anomArea)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AnomalyTimeline;

