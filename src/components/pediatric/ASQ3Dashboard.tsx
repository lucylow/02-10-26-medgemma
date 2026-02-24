"use client";

import { useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { ASQ3Dataset, type ASQ3DomainScores, type ASQ3Domain } from "@/data/pediatric/ASQ3Dataset";
import { cn } from "@/lib/utils";

const DOMAINS: ASQ3Domain[] = [
  "communication",
  "gross_motor",
  "fine_motor",
  "problem_solving",
  "personal_social",
];

const DOMAIN_LABELS: Record<ASQ3Domain, string> = {
  communication: "Communication",
  gross_motor: "Gross Motor",
  fine_motor: "Fine Motor",
  problem_solving: "Problem Solving",
  personal_social: "Personal-Social",
};

const defaultScores: ASQ3DomainScores = {
  communication: 25,
  gross_motor: 35,
  fine_motor: 28,
  problem_solving: 32,
  personal_social: 30,
};

interface ASQ3DashboardProps {
  age_months?: number;
  className?: string;
}

export function ASQ3Dashboard({ age_months = 24, className }: ASQ3DashboardProps) {
  const [scores, setScores] = useState<ASQ3DomainScores>(defaultScores);

  const cutoffs = ASQ3Dataset.getAgeCutoffs(age_months);
  const chartData = DOMAINS.map((domain) => ({
    domain: DOMAIN_LABELS[domain],
    domainKey: domain,
    score: scores[domain],
    cutoff: cutoffs[domain],
    fullMark: 60,
  }));

  const riskCount = DOMAINS.filter((d) => scores[d] < cutoffs[d]).length;
  const riskLabel =
    riskCount === 0 ? "ON TRACK" : riskCount <= 2 ? "MONITOR" : "REFERRAL";
  const riskClass =
    riskCount === 0
      ? "bg-emerald-500 text-white"
      : riskCount <= 2
        ? "bg-amber-500 text-white"
        : "bg-red-500 text-white";

  return (
    <div
      className={cn(
        "bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">
            ASQ-3 Screening
          </h2>
          <div className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-400">
            {age_months} months • {riskCount}/5 domains flagged
          </div>
        </div>
        <div
          className={cn(
            "px-5 py-2.5 rounded-2xl font-bold text-base sm:text-lg shrink-0",
            riskClass
          )}
        >
          {riskCount === 0 ? "✅ " : riskCount <= 2 ? "🟡 " : "🚨 "}
          {riskLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="domain"
                tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--foreground))" }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="hsl(224 76% 48%)"
                fill="hsl(224 76% 48%)"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Radar
                name="Cutoff"
                dataKey="cutoff"
                stroke="hsl(38 92% 50%)"
                fill="hsl(38 92% 50%)"
                fillOpacity={0.1}
                strokeDasharray="4 4"
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-md text-sm">
                      <div className="font-semibold mb-1">{p.domain}</div>
                      <div>Score: {p.score}</div>
                      <div>Cutoff: {p.cutoff}</div>
                    </div>
                  );
                }}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-5">
          {DOMAINS.map((domain) => (
            <div key={domain} className="space-y-2">
              <label className="flex justify-between items-center text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                <span>{DOMAIN_LABELS[domain]}</span>
                <span className="tabular-nums">
                  {scores[domain]} / {cutoffs[domain].toFixed(1)} cutoff
                </span>
              </label>
              <Slider
                value={[scores[domain]]}
                min={0}
                max={60}
                step={1}
                onValueChange={([v]) =>
                  setScores((prev) => ({ ...prev, [domain]: v ?? 0 }))
                }
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
