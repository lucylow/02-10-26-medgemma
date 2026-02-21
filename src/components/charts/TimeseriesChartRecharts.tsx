import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from "recharts";

export interface TimeseriesPoint {
  date: string;
  calls: number;
  errors: number;
  fallbacks: number;
  cost: number;
}

interface TimeseriesChartRechartsProps {
  data: TimeseriesPoint[];
  title?: string;
  showCostBar?: boolean;
  height?: number;
}

function formatCost(value: number): string {
  return value < 0.01 ? `$${value.toFixed(6)}` : `$${value.toFixed(4)}`;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div
      className="rounded-lg border bg-card p-3 shadow-md"
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
      }}
    >
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <ul className="space-y-1 text-sm">
        {payload.map((entry) => (
          <li key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}:{" "}
            {entry.dataKey === "cost"
              ? formatCost(Number(entry.value ?? 0))
              : entry.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TimeseriesChartRecharts({
  data,
  title = "Usage & cost over time",
  showCostBar = true,
  height = 320,
}: TimeseriesChartRechartsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>No telemetry data for this period.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            {showCostBar && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `$${v.toFixed(4)}`}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="calls"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
              name="Calls"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="errors"
              stroke="hsl(var(--destructive))"
              fill="hsl(var(--destructive))"
              fillOpacity={0.1}
              strokeWidth={2}
              name="Errors"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="fallbacks"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.08}
              strokeWidth={1.5}
              name="Fallbacks"
            />
            {showCostBar && (
              <Bar
                yAxisId="right"
                dataKey="cost"
                fill="hsl(var(--chart-2, 142 76% 36%))"
                name="Cost (USD)"
                radius={[4, 4, 0, 0]}
              />
            )}
            <Legend />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
