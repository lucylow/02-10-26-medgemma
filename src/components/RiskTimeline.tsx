// src/components/RiskTimeline.tsx - Screening history risk evolution
import React from "react";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockScreeningHistory = [
  { date: "Jan 2026", riskScore: 0.22, confidence: 0.94, domain: "Language" },
  { date: "Feb 2026", riskScore: 0.35, confidence: 0.87, domain: "Motor" },
  { date: "Mar 2026", riskScore: 0.28, confidence: 0.92, domain: "Social" },
];

const RISK_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export function RiskTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Screening Risk Timeline
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            Improving Trend
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockScreeningHistory} layout="vertical">
              <XAxis type="number" hide domain={[0, 1]} />
              <YAxis
                dataKey="date"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={20}
                tick={{ fontSize: 12, fill: "#64748b" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: unknown, name: string) => {
                  if (name === "riskScore" && typeof value === "number") {
                    return [`${Math.round(value * 100)}%`, "Risk"];
                  }
                  if (name === "confidence" && typeof value === "number") {
                    return [`${Math.round(value * 100)}%`, "Confidence"];
                  }
                  if (name === "domain") {
                    return [value as string, "Domain"];
                  }
                  return [value as string, name];
                }}
              />
              <Bar dataKey="riskScore" radius={[4, 4, 0, 0]}>
                {mockScreeningHistory.map((entry, index) => (
                  <Cell key={`cell-${entry.date}-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

