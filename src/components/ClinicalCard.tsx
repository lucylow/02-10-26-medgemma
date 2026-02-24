"use client";

import { useTokens } from "@/providers/ThemeProvider";
import { RiskChip, type RiskChipProps } from "@/components/RiskChip";

export interface ClinicalCardProps {
  risk: RiskChipProps["level"];
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function ClinicalCard({
  risk,
  title,
  children,
  actions,
}: ClinicalCardProps) {
  const t = useTokens();

  return (
    <div
      style={{
        background: t.colors.card,
        borderRadius: t.radii.lg,
        padding: t.spacing.lg,
        border: `1px solid ${t.colors.surface}`,
        boxShadow: t.shadows.elevated,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: t.spacing.md,
        }}
      >
        <RiskChip level={risk} size="sm" />
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: t.colors.text,
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ color: t.colors.text, lineHeight: 1.5 }}>{children}</div>
      {actions && (
        <div
          style={{
            marginTop: t.spacing.lg,
            paddingTop: t.spacing.md,
            borderTop: `1px solid ${t.colors.surface}`,
            display: "flex",
            gap: t.spacing.sm,
            flexWrap: "wrap",
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
