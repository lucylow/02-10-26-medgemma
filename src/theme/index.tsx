/**
 * MedGemma theme provider — design tokens for PediScreen AI
 * Use useContext(ThemeContext) or import from "@/theme/design-tokens"
 */
import React from "react";
import * as dt from "./design-tokens";

export interface DesignTokens {
  colors: {
    primary: string;
    secondary?: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    text: string;
    muted: string;
    surface: string;
    card: string;
    divider: string;
    primaryBlue?: string;
    secondaryBlue?: string;
    accentTeal?: string;
    successGreen?: string;
    warningYellow?: string;
    alertRed?: string;
    darkText?: string;
    mutedText?: string;
    surfaceLight?: string;
    dividerGray?: string;
    white?: string;
  };
  radii: { sm: number; md: number; lg: number };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  typography: {
    h1: { fontFamily: string; size: number; weight: number };
    h2: { fontFamily: string; size: number; weight: number };
    body: { fontFamily: string; size: number; weight: number };
    small?: { fontFamily: string; size: number; weight: number };
  };
}

const tokens: DesignTokens = {
  colors: {
    primary: dt.colors.primary,
    secondary: dt.colors.secondary,
    accent: dt.colors.accentTeal,
    success: dt.colors.success,
    warning: dt.colors.warning,
    danger: dt.colors.alert,
    text: dt.colors.text,
    muted: dt.colors.muted,
    surface: dt.colors.surface,
    card: dt.colors.card,
    divider: dt.colors.divider,
    primaryBlue: dt.colors.primary,
    secondaryBlue: dt.colors.secondary,
    accentTeal: dt.colors.accentTeal,
    successGreen: dt.colors.success,
    warningYellow: dt.colors.warning,
    alertRed: dt.colors.alert,
    darkText: dt.colors.text,
    mutedText: dt.colors.muted,
    surfaceLight: dt.colors.surface,
    dividerGray: dt.colors.divider,
    white: dt.colors.card,
  },
  radii: { ...dt.radii },
  spacing: { ...dt.spacing },
  typography: {
    h1: { fontFamily: dt.typography.title.fontFamily, size: dt.typography.title.fontSize + 4, weight: dt.typography.title.fontWeight },
    h2: { fontFamily: dt.typography.title.fontFamily, size: 28, weight: 600 },
    body: { fontFamily: dt.typography.body.fontFamily, size: dt.typography.body.fontSize, weight: 400 },
    small: { fontFamily: dt.typography.small.fontFamily, size: dt.typography.small.fontSize, weight: 400 },
  },
};

export const ThemeContext = React.createContext<DesignTokens>(tokens);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>
);

export { colors, spacing, radii, typography, riskColors } from "./design-tokens";
export type { RiskLevel } from "./design-tokens";
