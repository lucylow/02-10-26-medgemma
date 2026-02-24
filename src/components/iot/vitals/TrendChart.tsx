import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { PediatricVitalSigns } from "@/types/iot";
import { findAgeGroupForMonths } from "@/types/iot";
import styles from "./VitalSignsDashboard.module.css";

export interface TrendChartProps {
  data: PediatricVitalSigns[];
  height?: number;
  patientAgeMonths: number;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const hr = payload.find((p) => p.dataKey === "heartRate");

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTime}>{formatTime(label ?? "")}</div>
      {hr && (
        <div className={styles.tooltipValue}>
          Heart Rate: <span>{hr.value} bpm</span>
        </div>
      )}
    </div>
  );
};

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  height = 260,
  patientAgeMonths,
}) => {
  const ageGroup =
    findAgeGroupForMonths(patientAgeMonths) ||
    findAgeGroupForMonths(12) ||
    undefined;

  const minDomain = ageGroup
    ? ageGroup.vitalRanges.heartRate.min * 0.9
    : "auto";
  const maxDomain = ageGroup
    ? ageGroup.vitalRanges.heartRate.max * 1.1
    : "auto";

  return (
    <div className={styles.trendChart}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <defs>
            <linearGradient id="heartRateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e74c3c" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#e74c3c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            minTickGap={20}
            stroke="#6b7280"
          />
          <YAxis
            domain={[minDomain as number, maxDomain as number]}
            unit=" bpm"
            stroke="#6b7280"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="heartRate"
            stroke="#e74c3c"
            strokeWidth={3}
            dot={{ fill: "#e74c3c", strokeWidth: 2, r: 3 }}
            name="Heart Rate"
            fill="url(#heartRateGradient)"
          />
          {ageGroup && (
            <Line
              type="monotone"
              dataKey={() => ageGroup.vitalRanges.heartRate.max}
              strokeDasharray="5 5"
              stroke="#f39c12"
              name="Upper Threshold"
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

