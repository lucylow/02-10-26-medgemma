import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBiasMetrics, type BiasMetrics } from "@/services/monitoringApi";

export function BiasDashboard() {
  const [metrics, setMetrics] = useState<BiasMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getBiasMetrics()
      .then((res) => {
        if (mounted) setMetrics(res);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const di = metrics?.disparate_impact ?? 0;
  const status =
    di >= 0.9 ? "meets" : di >= 0.8 ? "borderline" : "below";

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base sm:text-lg">Bias &amp; Fairness Audit</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Disparate impact across protected groups (screening positives).
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className={
            status === "meets"
              ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30"
              : status === "borderline"
              ? "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-900/30"
              : "border-red-300 text-red-800 bg-red-50 dark:bg-red-900/30"
          }
        >
          DI {di.toFixed(2)} ·{" "}
          {status === "meets"
            ? "Within 4/5 rule"
            : status === "borderline"
            ? "Borderline"
            : "Investigate"}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {loading && (
          <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
            Loading bias metrics…
          </div>
        )}
        {!loading && metrics && (
          <>
            <div className="text-sm">
              <span className="font-medium">Disparate impact ratio</span>
              <span className="ml-1 text-muted-foreground">(min&nbsp;/&nbsp;max positive rate)</span>
              <div className="mt-1 text-base font-semibold">
                {di.toFixed(2)}
              </div>
            </div>
            {metrics.group_rates && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Group positive prediction rates
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(metrics.group_rates).map(([group, rate]) => (
                    <div
                      key={group}
                      className="flex items-center justify-between rounded-md border px-2 py-1.5 bg-muted/40"
                    >
                      <span className="truncate">{group}</span>
                      <span className="font-mono">{(rate * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {!loading && !metrics && (
          <p className="text-xs text-muted-foreground">
            No bias metrics available yet. Run screenings and ensure monitoring is enabled on the backend.
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
          0.8–1.25 is commonly used as an acceptable disparate impact band (“four-fifths rule”). Values
          below 0.8 should trigger a structured audit and dataset review.
        </p>
      </CardContent>
    </Card>
  );
}

