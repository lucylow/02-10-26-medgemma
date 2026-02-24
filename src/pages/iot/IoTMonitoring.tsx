import React from "react";
import {
  VitalSignsDashboard,
  PatientMonitor,
  DeviceList,
  LiveDeviceTelemetry,
} from "@/components/iot";

const IoTMonitoring: React.FC = () => {
  const patientId = "demo-child-001";
  const ageMonths = 24;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          IoT Remote Patient Monitoring
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Real-time pediatric vitals streaming from wearables and bedside
          devices. Designed for parents, CHWs, and pediatric teams.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2.2fr,1.5fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border bg-background shadow-lg">
            <VitalSignsDashboard
              patientId={patientId}
              ageMonths={ageMonths}
              patientDisplayName="Demo child"
            />
          </div>
          <div className="rounded-3xl border bg-background p-4 shadow-sm">
            <LiveDeviceTelemetry />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border bg-background p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              Connected devices
            </h2>
            <DeviceList />
          </div>
          <div className="rounded-3xl border bg-background p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              Patient summary
            </h2>
            <PatientMonitor />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IoTMonitoring;