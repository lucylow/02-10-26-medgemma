import { DriftDashboard } from "@/components/monitoring/DriftDashboard";
import { BiasDashboard } from "@/components/monitoring/BiasDashboard";

const Monitoring = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Model Monitoring &amp; Governance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
          Live drift and fairness signals for the PediScreen MedGemma stack. Use this dashboard to
          decide when to retrain, gate deployments, or trigger a manual audit.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DriftDashboard />
        </div>
        <div className="lg:col-span-1">
          <BiasDashboard />
        </div>
      </div>
    </div>
  );
};

export default Monitoring;

