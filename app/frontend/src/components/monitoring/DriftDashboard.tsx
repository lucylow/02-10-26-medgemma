import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDriftMetrics, type DriftMetricPoint } from "@/services/monitoringApi";

export function DriftDashboard() {
  const [data, setData] = useState<DriftMetricPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getDriftMetrics()
      .then((res) => {
        if (mounted) setData(res);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const latest = data[data.length - 1];
  const latestPsi = latest?.psi_score ?? 0;
  const status =
    latestPsi < 0.1 ? "stable" : latestPsi < 0.2 ? "watch" : "drifting";

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base sm:text-lg">Model Drift Monitoring</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Population stability over recent PediScreen cases.
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className={
            status === "stable"
              ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30"
              : status === "watch"
              ? "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-900/30"
              : "border-red-300 text-red-800 bg-red-50 dark:bg-red-900/30"
          }
        >
          PSI {latestPsi.toFixed(2)} ·{" "}
          {status === "stable" ? "Stable" : status === "watch" ? "Watch" : "Investigate"}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-56 sm:h-64">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Loading drift metrics…
            </div>
          ) : (
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={[0, "auto"]}
                  tickFormatter={(v) => v.toFixed(2)}
                />
                <Tooltip
                  formatter={(value: number) => value.toFixed(3)}
                  labelClassName="text-xs"
                  contentStyle={{
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="psi_score"
                  stroke="#ea4335"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
          PSI &lt; 0.1: stable. 0.1–0.2: monitor. &gt; 0.2: investigate cohort or pipeline
          changes before promoting new checkpoints.
        </p>
      </CardContent>
    </Card>
  );
}

