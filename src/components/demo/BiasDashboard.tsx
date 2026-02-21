/**
 * Bias / fairness dashboard — disparate impact, parity, flag badge.
 * For Storybook and monitoring E2E.
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Scale, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BiasDashboardProps {
  title?: string;
  disparateImpact?: number;
  flag?: boolean;
  demographicParity?: Record<string, number>;
  className?: string;
}

export function BiasDashboard({
  title = "Bias & Fairness",
  disparateImpact = 0.82,
  flag = false,
  demographicParity = {},
  className,
}: BiasDashboardProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Scale className="w-5 h-5" />
          {title}
        </h2>
        {flag && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Bias alert
          </Badge>
        )}
      </div>
      {flag && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fairness flag</AlertTitle>
          <AlertDescription>
            Subgroup performance gap detected. Review demographic parity and equalized odds.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Disparate impact: </span>
            <span className={disparateImpact < 0.8 ? "text-destructive font-medium" : ""}>
              {disparateImpact.toFixed(2)}
            </span>
          </p>
          {Object.keys(demographicParity).length > 0 && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Demographic parity (positive rate)</p>
              <ul className="list-disc ml-4">
                {Object.entries(demographicParity).map(([g, v]) => (
                  <li key={g}>{g}: {(v * 100).toFixed(1)}%</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BiasDashboard;
