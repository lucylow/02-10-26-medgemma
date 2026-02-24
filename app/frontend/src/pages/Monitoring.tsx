import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DriftDashboard } from "@/components/monitoring/DriftDashboard";
import { BiasDashboard } from "@/components/monitoring/BiasDashboard";
import { downloadPilotMetricsCsv, getFairnessMetrics, type FairnessItem } from "@/services/telemetryApi";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Scale } from "lucide-react";

const Monitoring = () => {
  const [exporting, setExporting] = useState(false);
  const [fairnessItems, setFairnessItems] = useState<FairnessItem[]>([]);
  const [fairnessLoading, setFairnessLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getFairnessMetrics({ limit: 100 })
      .then((res) => {
        if (mounted) setFairnessItems(res.items ?? []);
      })
      .finally(() => {
        if (mounted) setFairnessLoading(false);
      });
    return () => { mounted = false; };
  }, []);

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="w-4 h-4 text-muted-foreground" />
            Fairness by group
          </CardTitle>
          <CardDescription className="text-xs">
            False positive and false negative rates by protected group (from backend when available).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {fairnessLoading ? (
            <p className="text-xs text-muted-foreground py-4">Loading fairness metrics…</p>
          ) : fairnessItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">
              No fairness data yet. Enable Cloud SQL and populate fairness_metrics for live data.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Group</TableHead>
                    <TableHead className="text-xs">Attribute</TableHead>
                    <TableHead className="text-xs">FPR</TableHead>
                    <TableHead className="text-xs">FNR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fairnessItems.slice(0, 15).map((row, i) => (
                    <TableRow key={row.group_value ?? i}>
                      <TableCell className="text-xs font-medium">{row.group_value ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.protected_attribute ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{(row.false_positive_rate ?? 0).toFixed(3)}</TableCell>
                      <TableCell className="text-xs font-mono">{(row.false_negative_rate ?? 0).toFixed(3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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

