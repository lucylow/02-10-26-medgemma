/**
 * Chip for risk levels (low / monitor / high / refer) — design tokens, aria.
 */
import React from "react";
import { colors, spacing, radii, riskColors, type RiskLevel } from "@/theme/design-tokens";

export interface ChipProps {
  level: RiskLevel;
  label?: string;
  "aria-label"?: string;
  className?: string;
}

const defaultLabels: Record<RiskLevel, string> = {
  low: "On track",
  monitor: "Monitor",
  high: "High",
  refer: "Refer",
};

export const Chip = ({
  level,
  label = defaultLabels[level],
  "aria-label": ariaLabel,
  className = "",
}: ChipProps) => {
  const bg = riskColors[level];
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: radii.sm,
    backgroundColor: bg,
    color: colors.card,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "Roboto, system-ui, sans-serif",
  };
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? `Risk: ${label}`}
      style={style}
      className={className}
    >
      {label}
    </span>
  );
};
