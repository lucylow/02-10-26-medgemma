import React from "react";
import type { PediatricVitalSigns } from "@/types/iot";
import styles from "./VitalSignsDashboard.module.css";

type Trend = "rising" | "falling" | "stable" | "normal";

interface VitalCardProps {
  label: string;
  value: number | undefined;
  unit: string;
  range?:
    | {
        min: number;
        max: number;
      }
    | undefined;
  trend?: Trend;
  color?: string;
}

export const VitalCard: React.FC<VitalCardProps> = ({
  label,
  value,
  unit,
  range,
  trend = "stable",
  color = "#1a73e8",
}) => {
  const status: "normal" | "warning" | "critical" = (() => {
    if (value == null || !range) return "warning";
    if (value < range.min || value > range.max) {
      const delta =
        value < range.min ? range.min - value : value - range.max;
      const span = range.max - range.min || 1;
      return delta / span > 0.2 ? "critical" : "warning";
    }
    return "normal";
  })();

  const formatted =
    value == null || Number.isNaN(value) ? "—" : value.toFixed(0);

  return (
    <div
      className={`${styles.vitalCard} ${styles[status]}`}
      style={{ borderLeftColor: color }}
    >
      <div className={styles.vitalHeader}>
        <span className={styles.vitalLabel}>{label}</span>
        {range && (
          <span className={styles.vitalRange}>
            {range.min}–{range.max} {unit}
          </span>
        )}
      </div>
      <div className={styles.vitalValue} style={{ color }}>
        {formatted}
        <span className={styles.vitalUnit}>{unit}</span>
      </div>
      <div className={styles.vitalFooter}>
        <span
          className={`${styles.trendBadge} ${
            trend === "rising"
              ? styles.trendRising
              : trend === "falling"
                ? styles.trendFalling
                : styles.trendStable
          }`}
        >
          {trend === "rising"
            ? "Rising"
            : trend === "falling"
              ? "Falling"
              : "Stable"}
        </span>
        {status === "critical" && (
          <span className={styles.criticalBadge}>CRITICAL</span>
        )}
        {status === "warning" && (
          <span className={styles.warningBadge}>Monitor</span>
        )}
        {status === "normal" && (
          <span className={styles.normalBadge}>Normal</span>
        )}
      </div>
    </div>
  );
};

export type { PediatricVitalSigns };

