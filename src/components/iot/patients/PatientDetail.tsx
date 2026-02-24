import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Area,
} from "recharts";
import type { PatientMockDataBundle } from "@/types/iot";

interface PatientDetailProps {
  bundle: PatientMockDataBundle;
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

export function PatientDetail({ bundle }: PatientDetailProps) {
  const latest = bundle.realtimeVitals[bundle.realtimeVitals.length - 1];

  const vitals24h = bundle.vitals24h.map((v) => ({
    ...v,
    ts: v.timestamp,
  }));

  const growth = bundle.growthTimeline;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-gradient-to-tr from-sky-500 via-teal-400 to-emerald-400 text-sm font-semibold text-white shadow-lg shadow-sky-500/40">
            {bundle.patient.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {bundle.patient.displayName}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {(bundle.patient.ageMonths / 12).toFixed(1)} years •{" "}
              {bundle.patient.primaryCondition ?? "Routine pediatrics"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-100">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live connected
          </span>
          <span className="rounded-full bg-slate-900 px-2 py-1 text-slate-50 shadow-sm dark:bg-slate-50 dark:text-slate-900">
            Caregiver view ready
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <motion.div
          className="col-span-2 rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="mb-1 text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            24‑hour heart rate
          </h3>
          <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
            Shows overnight dips and daytime peaks. Bands reflect typical range
            for this age.
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vitals24h}>
                <defs>
                  <linearGradient id="hrArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97373" stopOpacity={0.45} />
                    <stop
                      offset="100%"
                      stopColor="#f97373"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="ts"
                  tickFormatter={(v: Date) => formatTime(new Date(v))}
                  minTickGap={24}
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  domain={["dataMin - 10", "dataMax + 10"]}
                  unit=" bpm"
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 12,
                    borderColor: "#e5e7eb",
                  }}
                  labelFormatter={(v) => formatTime(new Date(v as Date))}
                />
                <Area
                  type="monotone"
                  dataKey="heartRate"
                  stroke="transparent"
                  fill="url(#hrArea)"
                />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col gap-2 rounded-3xl border border-white/60 bg-slate-900 p-3 text-slate-50 shadow-lg shadow-sky-500/10 backdrop-blur-xl dark:border-slate-700"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h3 className="text-xs font-semibold tracking-tight">
            Family caregiver view
          </h3>
          <p className="text-[11px] text-slate-300">
            Plain‑language summary that can be safely read aloud to parents or
            caregivers.
          </p>
          <div className="mt-1 space-y-1.5 rounded-2xl bg-slate-800/70 p-2 text-[11px] text-slate-100">
            <p>
              Today{" "}
              <span className="font-semibold">{bundle.patient.displayName}</span>{" "}
              has had{" "}
              <span className="font-semibold">
                {bundle.alerts.filter((a) => a.type === "critical").length}
              </span>{" "}
              serious and{" "}
              <span className="font-semibold">
                {bundle.alerts.filter((a) => a.type === "warning").length}
              </span>{" "}
              mild alerts.
            </p>
            {latest && (
              <p>
                Right now their heart rate is{" "}
                <span className="font-semibold">
                  {Math.round(latest.heartRate)} beats per minute
                </span>{" "}
                and oxygen level is{" "}
                <span className="font-semibold">
                  {latest.oxygenSaturation.toFixed(1)}%
                </span>
                , which is{" "}
                <span className="font-semibold">
                  {latest.oxygenSaturation >= 95 ? "reassuring" : "lower than usual"}
                </span>
                .
              </p>
            )}
            <p>
              We recommend continuing their usual plan and contacting a clinician if
              you notice breathing that looks harder, blue lips, or if they are
              unusually sleepy.
            </p>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="grid gap-3 md:grid-cols-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
          <h3 className="mb-1 text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Growth timeline
          </h3>
          <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
            Height and weight percentiles over time compared to peers.
          </p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="ageMonths"
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(m: number) => `${Math.round(m / 12)}y`}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 12,
                    borderColor: "#e5e7eb",
                  }}
                  labelFormatter={(m) => `${(Number(m) / 12).toFixed(1)} years`}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="heightPercentile"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                  name="Height %"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="weightPercentile"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Weight %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg shadow-sky-500/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
          <h3 className="mb-1 text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            7‑day activity and alerts
          </h3>
          <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
            Quick view of quieter nights, active mornings, and when alerts tend to
            cluster.
          </p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {bundle.anomalies.slice(0, 6).map((event) => (
              <span
                key={event.id}
                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
              >
                <span
                  className={`mr-1 h-1.5 w-1.5 rounded-full ${
                    event.severity === "critical"
                      ? "bg-rose-500"
                      : event.severity === "warning"
                        ? "bg-amber-500"
                        : "bg-sky-500"
                  }`}
                />
                {event.summary}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default PatientDetail;

