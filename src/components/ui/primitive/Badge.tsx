/**
 * Badge for adapter_id, model_id, version — design tokens, muted style.
 */
import React from "react";
import { colors, spacing, radii } from "@/theme/design-tokens";

export interface BadgeProps {
  label: string;
  value: string;
  "aria-label"?: string;
  className?: string;
}

export const Badge = ({
  label,
  value,
  "aria-label": ariaLabel,
  className = "",
}: BadgeProps) => {
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: spacing.xs,
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.divider}`,
    fontSize: 12,
    fontFamily: "Roboto, system-ui, sans-serif",
    color: colors.muted,
  };
  return (
    <span
      aria-label={ariaLabel ?? `${label}: ${value}`}
      style={style}
      className={className}
    >
      <span style={{ fontWeight: 600, color: colors.text }}>{label}:</span> {value}
    </span>
  );
};
