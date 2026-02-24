// src/components/VitalsDashboard.tsx - Live rPPG monitoring charts
import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { useHealthData, type VitalDataPoint } from "@/hooks/useHealthData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VitalsDashboard() {
  const { vitalsHistory, isMonitoring, startMonitoring, stopMonitoring, latestVitals } = useHealthData();

  const chartData = vitalsHistory.map((point: VitalDataPoint) => ({
    time: new Date(point.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    hr: point.heartRate,
    rr: point.respiratoryRate,
    spo2: point.oxygenSaturation,
    temp: point.temperature,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Live Vitals Cards */}
      <Card className="col-span-1 lg:col-span-2 bg-gradient-to-r from-blue-50 to-emerald-50 border-emerald-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            Live Vitals Monitoring (rPPG)
          </CardTitle>
          <div className="flex gap-4 text-sm mt-2">
            <button
              type="button"
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                isMonitoring
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-lg"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
              }`}
            >
              {isMonitoring ? "⏹️ Stop Monitoring" : "▶️ Start Live Monitoring"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <VitalGauge
              value={latestVitals?.heartRate || 80}
              label="HR"
              unit="bpm"
              min={60}
              max={140}
              color="bg-red-500"
            />
            <VitalGauge
              value={latestVitals?.respiratoryRate || 20}
              label="RR"
              unit="rpm"
              min={12}
              max={40}
              color="bg-blue-500"
            />
            <VitalGauge
              value={latestVitals?.temperature || 98.6}
              label="Temp"
              unit="°F"
              min={97}
              max={100.4}
              color="bg-orange-500"
            />
            <VitalGauge
              value={latestVitals?.oxygenSaturation || 98}
              label="SpO₂"
              unit="%"
              min={95}
              max={100}
              color="bg-purple-500"
            />
          </div>

          {/* Real-time Line Chart */}
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.slice(-30)} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  interval={chartData.length > 8 ? Math.floor(chartData.length / 8) : 0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hr"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ fill: "#ef4444", strokeWidth: 2 }}
                  name="Heart Rate"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="rr"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                  name="Resp Rate"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Circular Gauge Component
function VitalGauge({
  value,
  label,
  unit,
  min,
  max,
  color,
}: {
  value: number;
  label: string;
  unit: string;
  min: number;
  max: number;
  color: string;
}) {
  const clamped = Math.min(Math.max(value, min), max);
  const percentage = ((clamped - min) / (max - min)) * 100;
  const isNormal = percentage >= 20 && percentage <= 80;

  const dash = Math.max(0, Math.min(100, percentage));

  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={2}
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            className={color}
            strokeWidth={2}
            strokeDasharray={`${dash}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${isNormal ? "text-emerald-600" : "text-red-600"}`}>
            {Math.round(clamped)}
          </span>
        </div>
      </div>
      <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">{label}</div>
      <div className="text-xs text-gray-500">{unit}</div>
    </div>
  );
}

