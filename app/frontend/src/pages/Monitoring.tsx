import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DriftDashboard } from "@/components/monitoring/DriftDashboard";
import { BiasDashboard } from "@/components/monitoring/BiasDashboard";
import { downloadPilotMetricsCsv } from "@/services/telemetryApi";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";

const Monitoring = () => {
  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadPilotMetricsCsv();
      toast.success("Pilot metrics CSV downloaded.");
    } catch {
      toast.error("Export failed. Check backend and API key.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Model Monitoring &amp; Governance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Live drift and fairness signals for the PediScreen MedGemma stack. Use this dashboard to
            decide when to retrain, gate deployments, or trigger a manual audit.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={exporting}
          className="gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DriftDashboard />
        </div>
        <div className="lg:col-span-1">
          <BiasDashboard />
        </div>
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            Governance export
          </CardTitle>
          <CardDescription className="text-xs">
            Download drift and bias summary as CSV for IRB or audit. Uses the same backend data as
            the charts above (pilot-metrics).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button variant="secondary" size="sm" onClick={handleExportCsv} disabled={exporting} className="gap-2">
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Download pilot metrics (CSV)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Monitoring;

