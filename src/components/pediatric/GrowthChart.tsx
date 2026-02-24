"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

export interface GrowthPoint {
  age_months: number;
  length_cm: number;
  weight_kg: number;
  z_length: number;
  z_weight: number;
}

/** Simplified WHO 2006-style reference curves (3rd/97th ≈ ±1.88 SD). Used for visualization. */
const WHO_REF = {
  length_z_3rd: (age_months: number) => -1.88 + (age_months / 60) * 0.2,
  length_z_97th: (age_months: number) => 1.88 - (age_months / 60) * 0.1,
  weight_z_3rd: (age_months: number) => -1.88 + (age_months / 60) * 0.15,
  weight_z_97th: (age_months: number) => 1.88 - (age_months / 60) * 0.1,
};

function defaultData(): GrowthPoint[] {
  return [6, 9, 12, 18, 24].map((age_months, i) => {
    const z_length = -0.5 + (i * 0.3) + (Math.random() - 0.5) * 0.4;
    const z_weight = -0.3 + (i * 0.25) + (Math.random() - 0.5) * 0.3;
    const length_cm = 45 + age_months * 0.85 + z_length * 3;
    const weight_kg = 3.2 + age_months * 0.18 + z_weight * 0.8;
    return {
      age_months,
      length_cm: Math.round(length_cm * 10) / 10,
      weight_kg: Math.round(weight_kg * 100) / 100,
      z_length: Math.round(z_length * 100) / 100,
      z_weight: Math.round(z_weight * 100) / 100,
    };
  });
}

interface GrowthChartProps {
  initialData?: GrowthPoint[];
  className?: string;
}

export function GrowthChart({ initialData, className }: GrowthChartProps) {
  const [measurements, setMeasurements] = useState<GrowthPoint[]>(
    initialData ?? defaultData()
  );
  const [ageInput, setAgeInput] = useState("");
  const [lengthInput, setLengthInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

  const chartData = measurements.map((m) => ({
    ...m,
    length_3rd: WHO_REF.length_z_3rd(m.age_months),
    length_97th: WHO_REF.length_z_97th(m.age_months),
    weight_3rd: WHO_REF.weight_z_3rd(m.age_months),
    weight_97th: WHO_REF.weight_z_97th(m.age_months),
  }));

  const handleAddPoint = () => {
    const age = parseInt(ageInput, 10);
    const length = parseFloat(lengthInput);
    const weight = parseFloat(weightInput);
    if (Number.isNaN(age) || age < 0 || age > 60) return;
    if (Number.isNaN(length) || length < 40 || length > 120) return;
    if (Number.isNaN(weight) || weight < 2 || weight > 30) return;
    const z_length = (length - (45 + age * 0.85)) / 3;
    const z_weight = (weight - (3.2 + age * 0.18)) / 0.8;
    setMeasurements((prev) =>
      [...prev, { age_months: age, length_cm: length, weight_kg: weight, z_length, z_weight }].sort(
        (a, b) => a.age_months - b.age_months
      )
    );
    setAgeInput("");
    setLengthInput("");
    setWeightInput("");
  };

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-200 dark:border-emerald-800",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400 bg-clip-text text-transparent">
          Growth Trajectory
        </h2>
        <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
          {measurements.length} measurements • WHO Z-scores
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="age_months"
            tickFormatter={(v) => `${v}mo`}
            tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--foreground))" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
            domain={[-3, 3]}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              typeof value === "number" ? value.toFixed(2) : value,
              name === "z_length" ? "Length Z-score" : name === "z_weight" ? "Weight Z-score" : name,
            ]}
            labelFormatter={(label) => `${label} months`}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
          <Line
            type="monotone"
            dataKey="z_length"
            stroke="hsl(224 76% 48%)"
            strokeWidth={3}
            dot={{ fill: "hsl(224 76% 48%)", strokeWidth: 2, r: 4 }}
            name="Length Z"
          />
          <Line
            type="monotone"
            dataKey="z_weight"
            stroke="hsl(152 58% 42%)"
            strokeWidth={3}
            dot={{ fill: "hsl(152 58% 42%)", strokeWidth: 2, r: 4 }}
            name="Weight Z"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6 p-4 sm:p-6 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Age (mo)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              placeholder="e.g. 12"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Length (cm)
            </label>
            <input
              type="number"
              step={0.1}
              min={40}
              max={120}
              placeholder="e.g. 74"
              value={lengthInput}
              onChange={(e) => setLengthInput(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              step={0.1}
              min={2}
              max={30}
              placeholder="e.g. 9.2"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAddPoint}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-4 py-2.5 font-bold text-sm hover:shadow-lg transition-all"
          >
            ➕ Add Point
          </button>
        </div>
      </div>
    </div>
  );
}
