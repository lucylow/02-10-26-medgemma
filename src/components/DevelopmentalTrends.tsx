// src/components/DevelopmentalTrends.tsx - Longitudinal ASQ-3 tracking
import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";

import { useHealthData } from "@/hooks/useHealthData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DevelopmentalTrends() {
  const { developmentalHistory } = useHealthData();

  const chartData = developmentalHistory.map((data) => ({
    age: `${data.ageMonths}mo`,
    asq3: data.asq3Score,
    language: data.languagePercentile,
    motor: data.motorPercentile,
    risk: data.riskLevel,
  }));

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="w-2 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
          Developmental Progress Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid vertical={false} stroke="#f8fafc" strokeDasharray="4 4" />
              <XAxis
                dataKey="age"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                }}
              />
              <Legend />

              <defs>
                <linearGradient id="asq3Color" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="languageColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <Area
                type="monotone"
                dataKey="asq3"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#asq3Color)"
                name="ASQ-3 Score"
                dot={{ fill: "#10b981", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="language"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#languageColor)"
                name="Language %ile"
                dot={{ fill: "#3b82f6", strokeWidth: 2 }}
              />

              {/* Risk Reference Lines */}
              {chartData.map((point, index) =>
                point.risk === "HIGH" ? (
                  <ReferenceLine
                    key={`high-${index}`}
                    x={point.age}
                    stroke="#ef4444"
                    strokeWidth={3}
                    label={{
                      position: "top",
                      value: "HIGH RISK",
                      fill: "#ef4444",
                      fontWeight: "bold",
                    }}
                  />
                ) : null,
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-200 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-400 rounded-full" />
            <span>LOW Risk (50th+ %ile)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-400 rounded-full" />
            <span>MEDIUM Risk (25-50th %ile)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded-full" />
            <span>HIGH Risk (&lt;25th %ile)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

