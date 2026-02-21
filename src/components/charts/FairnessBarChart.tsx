/**
 * Phase 4: Bias & fairness monitoring dashboard — FPR/FNR by protected group.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface FairnessDataPoint {
  group: string;
  false_positive_rate: number;
  false_negative_rate: number;
  demographic_parity?: number;
  equalized_odds?: number;
}

interface FairnessBarChartProps {
  data: FairnessDataPoint[];
  title?: string;
  height?: number;
}

export function FairnessBarChart({
  data,
  title = "Fairness metrics by group",
  height = 320,
}: FairnessBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>No fairness data. Run fairness evaluation to populate metrics.</p>
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
          <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="group" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" domain={[0, 1]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [(value * 100).toFixed(2) + "%", ""]}
            />
            <Legend />
            <Bar dataKey="false_positive_rate" name="False positive rate" fill="#EA4335" radius={[4, 4, 0, 0]} />
            <Bar dataKey="false_negative_rate" name="False negative rate" fill="#FBBC05" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
