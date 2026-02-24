import React from "react";
import { PatientMonitor } from "@/components/iot";
import { GrowthChart } from "@/components/iot";
import { DailySummary } from "@/components/iot";

const PatientDashboard: React.FC = () => {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Patient IoT Dashboard
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Longitudinal overview of remote monitoring signals for a single child.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.6fr,1.1fr]">
        <div className="space-y-4">
          <PatientMonitor />
          <DailySummary />
        </div>
        <GrowthChart />
      </div>
    </div>
  );
};

export default PatientDashboard;

