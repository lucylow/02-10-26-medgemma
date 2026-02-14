/**
 * Risk chip — color-coded for on_track | monitor | refer
 */
import React, { useContext } from "react";
import { ThemeContext } from "@/theme";

export type RiskLevel = "low" | "on_track" | "monitor" | "refer" | "high" | "unknown";

export interface RiskChipProps {
  risk: RiskLevel;
  label?: string;
  "aria-label"?: string;
}

const riskConfig: Record<string, { bg: string; color: string; defaultLabel: string }> = {
  low: { bg: "#E8F7EF", color: "#34A853", defaultLabel: "Low" },
  on_track: { bg: "#E8F7EF", color: "#34A853", defaultLabel: "On Track" },
  monitor: { bg: "#FFF4E5", color: "#FBBC05", defaultLabel: "Monitor" },
  refer: { bg: "#FDECEA", color: "#EA4335", defaultLabel: "Refer" },
  high: { bg: "#FDECEA", color: "#EA4335", defaultLabel: "Refer" },
  unknown: { bg: "#FFF4E5", color: "#FBBC05", defaultLabel: "Unknown" },
};

export const RiskChip: React.FC<RiskChipProps> = ({
  risk,
  label,
  "aria-label": ariaLabel,
}) => {
  const t = useContext(ThemeContext);
  const normalized = (risk?.toLowerCase() || "unknown") as RiskLevel;
  const config = riskConfig[normalized] ?? riskConfig.unknown;
  const displayLabel = label ?? config.defaultLabel;

  return (
    <span
      role="status"
      aria-label={ariaLabel ?? `Risk level: ${displayLabel}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: `${t.spacing.xs}px ${t.spacing.sm}px`,
        borderRadius: t.radii.sm,
        fontSize: t.typography.body.size - 2,
        fontWeight: 600,
      }}
    >
      {displayLabel}
    </span>
  );
};
