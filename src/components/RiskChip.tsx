"use client";

import { useTokens } from "@/providers/ThemeProvider";

export type RiskChipLevel = "referral" | "urgent" | "monitor" | "ontrack";

export interface RiskChipProps {
  level: RiskChipLevel;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

const levelConfig = (
  t: ReturnType<typeof useTokens>
): Record<
  RiskChipLevel,
  { bg: string; border: string; text: string }
> => ({
  referral: {
    bg: `${t.colors.referral}20`,
    border: t.colors.referral,
    text: t.colors.referral,
  },
  urgent: {
    bg: `${t.colors.urgent}20`,
    border: t.colors.urgent,
    text: t.colors.urgent,
  },
  monitor: {
    bg: `${t.colors.monitor}20`,
    border: t.colors.monitor,
    text: t.colors.monitor,
  },
  ontrack: {
    bg: `${t.colors.ontrack}20`,
    border: t.colors.ontrack,
    text: t.colors.ontrack,
  },
});

export function RiskChip({
  level,
  size = "md",
  children,
}: RiskChipProps) {
  const t = useTokens();
  const config = levelConfig(t)[level];

  const paddingKey = size === "lg" ? "xl" : size === "sm" ? "sm" : "md";
  const padding = t.spacing[paddingKey];
  const fontSize = size === "lg" ? 18 : size === "sm" ? 14 : 16;
  const minWidth = size === "lg" ? 120 : size === "sm" ? 80 : 100;

  return (
    <div
      role="status"
      aria-label={`Risk level: ${children ?? level}`}
      style={{
        padding: `${padding}px ${t.spacing.lg}px`,
        borderRadius: t.radii.full,
        background: config.bg,
        border: `3px solid ${config.border}`,
        color: config.text,
        fontWeight: 700,
        fontSize,
        minWidth,
        textAlign: "center",
        boxShadow: t.shadows.card,
      }}
    >
      {children ?? level.toUpperCase()}
    </div>
  );
}
