import React from "react";
import { DeviceList } from "@/components/iot";

const DeviceSetup: React.FC = () => {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          IoT Device Setup
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Pair wearables, bedside monitors, and smart patches with PediScreen
          AI. This page is UI-only and expects secure pairing flows handled by
          the backend / mobile clients.
        </p>
      </div>

      <div className="rounded-3xl border bg-background p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Registered devices
        </h2>
        <DeviceList />
      </div>
    </div>
  );
};

export default DeviceSetup;

