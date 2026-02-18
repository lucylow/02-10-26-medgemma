import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface TimeseriesPoint {
  date: string;
  calls: number;
  errors: number;
  fallbacks: number;
  cost: number;
}

interface UsageTimeseriesProps {
  data: TimeseriesPoint[];
  title?: string;
}

export function UsageTimeseries({ data, title = "Calls per day" }: UsageTimeseriesProps) {
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
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="calls"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.15}
              strokeWidth={2}
              name="Calls"
            />
            <Area
              type="monotone"
              dataKey="errors"
              stroke="hsl(var(--destructive))"
              fill="hsl(var(--destructive))"
              fillOpacity={0.1}
              strokeWidth={2}
              name="Errors"
            />
            <Area
              type="monotone"
              dataKey="fallbacks"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.08}
              strokeWidth={1.5}
              name="Fallbacks"
            />
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
