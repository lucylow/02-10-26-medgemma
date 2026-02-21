/**
 * Drift monitoring dashboard — PSI series + severity banner.
 * For Storybook and monitoring E2E.
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DriftDataPoint {
  date: string;
  psi_score: number;
  severity?: string;
}

export interface DriftDashboardProps {
  title?: string;
  data?: DriftDataPoint[];
  severity?: "none" | "moderate" | "high";
  showAlert?: boolean;
  className?: string;
}

export function DriftDashboard({
  title = "Model Drift Monitoring",
  data = [],
  severity = "none",
  showAlert = true,
  className,
}: DriftDashboardProps) {
  const hasSpike = severity === "high" || severity === "moderate";
  const alertSeverity = severity === "high" ? "HIGH" : severity === "moderate" ? "MODERATE" : null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {title}
        </h2>
        {hasSpike && showAlert && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Drift {alertSeverity}
          </Badge>
        )}
      </div>
      {hasSpike && showAlert && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Drift alert</AlertTitle>
          <AlertDescription>
            PSI exceeds threshold. Consider recalibration or review recent model inputs.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PSI over time</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drift data yet.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {data.map((d) => (
                <li key={d.date} className="flex justify-between">
                  <span>{d.date}</span>
                  <span className={d.psi_score > 0.2 ? "text-destructive font-medium" : ""}>
                    PSI {d.psi_score.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DriftDashboard;
