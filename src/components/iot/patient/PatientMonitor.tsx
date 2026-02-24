import React from "react";
import { HeartRateWidget } from "@/components/iot/widgets/HeartRateWidget";
import { OxygenSatWidget } from "@/components/iot/widgets/OxygenSatWidget";
import { RespiratoryRateWidget } from "@/components/iot/widgets/RespiratoryRateWidget";
import { TemperatureWidget } from "@/components/iot/widgets/TemperatureWidget";
import { ActivityWidget } from "@/components/iot/widgets/ActivityWidget";
import { AlertHistory } from "@/components/iot/alerts/AlertHistory";

export const PatientMonitor: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <HeartRateWidget />
        <RespiratoryRateWidget />
        <OxygenSatWidget />
        <TemperatureWidget />
        <ActivityWidget />
      </div>
      <AlertHistory />
    </div>
  );
};

