/**
 * MedGemma theme provider — design tokens for PediScreen AI
 * Use useContext(ThemeContext) to access colors, radii, spacing, typography
 */
import React from "react";

export interface DesignTokens {
  colors: {
    primary: string;
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

import tokensJson from "../../design/tokens.json";
const tokens = tokensJson as DesignTokens;

export const ThemeContext = React.createContext<DesignTokens>(tokens);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>
);
