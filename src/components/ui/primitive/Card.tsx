/**
 * Card primitive with header/body/footer slots — uses design tokens.
 */
import React from "react";
import { colors, spacing, radii } from "@/theme/design-tokens";

export interface PrimitiveCardProps {
  children: React.ReactNode;
  className?: string;
}

const cardStyle: React.CSSProperties = {
  background: colors.card,
  borderRadius: radii.md,
  border: `1px solid ${colors.divider}`,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  overflow: "hidden",
};

export const PrimitiveCard = ({ children, className = "" }: PrimitiveCardProps) => (
  <div style={cardStyle} className={className}>
    {children}
  </div>
);

const headerStyle: React.CSSProperties = {
  padding: spacing.md,
  borderBottom: `1px solid ${colors.divider}`,
  fontFamily: "Poppins, system-ui, sans-serif",
  fontSize: 18,
  fontWeight: 600,
  color: colors.text,
};

export const PrimitiveCardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div style={headerStyle} className={className}>
    {children}
  </div>
);

const bodyStyle: React.CSSProperties = {
  padding: spacing.md,
  fontFamily: "Roboto, system-ui, sans-serif",
  fontSize: 16,
  lineHeight: 1.4,
  color: colors.text,
};

export const PrimitiveCardBody = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div style={bodyStyle} className={className}>
    {children}
  </div>
);

const footerStyle: React.CSSProperties = {
  padding: spacing.md,
  borderTop: `1px solid ${colors.divider}`,
};

export const PrimitiveCardFooter = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div style={footerStyle} className={className}>
    {children}
  </div>
);
