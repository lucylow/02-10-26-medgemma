import { Activity } from "lucide-react";
import { EdgeDashboard } from "@/components/EdgeDashboard";

export default function EdgeDevices() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Raspberry Pi 5 Edge AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor on-device MedGemma inference across Raspberry Pi 5 deployments, backed by Supabase Edge Functions.
          </p>
        </div>
      </header>

      <EdgeDashboard />
    </div>
  );
}

