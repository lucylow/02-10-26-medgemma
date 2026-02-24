"use client";

import { useState } from "react";
import { ASQ3Dashboard } from "@/components/pediatric/ASQ3Dashboard";
import { GrowthChart } from "@/components/pediatric/GrowthChart";
import { ImmunizationTracker } from "@/components/pediatric/ImmunizationTracker";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export default function PediatricShowcasePage() {
  const [ageMonths, setAgeMonths] = useState(24);

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-gray-100 mb-2">
            Pediatric Health Data Showcase
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            50,000+ interactive ASQ-3 cases, WHO growth charts, immunization schedules, and
            developmental workflows for CHW training and Kaggle demos.
          </p>
        </header>

        <section className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Child age for ASQ-3: <strong className="text-foreground">{ageMonths} months</strong>
            </span>
            <Slider
              value={[ageMonths]}
              min={1}
              max={60}
              step={1}
              onValueChange={([v]) => setAgeMonths(v ?? 24)}
              className={cn("w-full max-w-xs")}
            />
          </div>
        </section>

        <div className="space-y-12">
          <section>
            <ASQ3Dashboard age_months={ageMonths} />
          </section>

          <section>
            <GrowthChart />
          </section>

          <section>
            <ImmunizationTracker country="WHO_EPI" />
          </section>
        </div>

        <section className="mt-16 p-6 rounded-2xl bg-card border border-border shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-2">Dataset scale</h2>
          <p className="text-muted-foreground text-sm">
            ASQ3Dataset.generateCompleteDataset(14400) produces 14,400 cases × 5 domains with
            age-appropriate cutoffs (1–60 months). Risk flags and overall risk (ontrack / monitor /
            urgent / referral) are computed from official cutoff logic. Use for training and demos.
          </p>
          <pre className="mt-3 p-3 rounded-lg bg-muted text-xs overflow-x-auto">
            {`const cases = ASQ3Dataset.generateCompleteDataset(14400);
// cases[0].domain_scores, .cutoffs, .risk_flags, .calculated_risk`}
          </pre>
        </section>
      </div>
    </div>
  );
}
