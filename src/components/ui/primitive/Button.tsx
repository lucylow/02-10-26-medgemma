/**
 * Accessible Button primitive — uses design tokens; primary, secondary, ghost.
 * Use for capture flow and clinician actions; ensure aria-label when icon-only.
 */
import React from "react";
import { colors, spacing, radii } from "@/theme/design-tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface PrimitiveButtonProps {
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  "aria-label"?: string;
  "aria-busy"?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  className?: string;
}

const baseStyle: React.CSSProperties = {
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderRadius: radii.sm,
  minHeight: 44,
  minWidth: 44,
  fontFamily: "Roboto, system-ui, sans-serif",
  fontSize: 16,
  fontWeight: 500,
  border: "none",
  outline: "none",
  cursor: "pointer",
  transition: "background 0.15s, box-shadow 0.15s",
};
const focusRing = "0 0 0 2px " + colors.surface + ", 0 0 0 4px " + colors.primary;

export const PrimitiveButton = ({
  variant = "primary",
  onClick,
  disabled = false,
  loading = false,
  "aria-label": ariaLabel,
  "aria-busy": ariaBusy,
  children,
  type = "button",
  className = "",
}: PrimitiveButtonProps) => {
  const isDisabled = disabled || loading;
  const style: React.CSSProperties = {
    ...baseStyle,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.7 : 1,
  };

  if (variant === "primary") {
    style.background = colors.primary;
    style.color = colors.card;
  } else if (variant === "secondary") {
    style.background = colors.card;
    style.color = colors.primary;
    style.border = `1px solid ${colors.divider}`;
  } else {
    style.background = "transparent";
    style.color = colors.text;
  }

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      aria-busy={ariaBusy ?? loading}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      onClick={onClick}
      className={className}
      style={style}
      onFocus={(e) => {
        if (!isDisabled) e.currentTarget.style.boxShadow = focusRing;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {loading ? "…" : children}
    </button>
  );
};
