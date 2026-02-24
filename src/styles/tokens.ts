/**
 * MedGemma medical palette — design tokens for PediScreen clinical UX.
 * Risk-first hierarchy, spacing, radii, shadows. Use via useTokens() from ThemeProvider.
 */

export const tokens = {
  colors: {
    // Risk Hierarchy (Medical Priority)
    referral: "#EA4335", // 🚨 IMMEDIATE (top priority)
    urgent: "#FF9800", // ⚠️ 72hr intervention
    monitor: "#FBBC05", // 🟡 30-day follow-up
    ontrack: "#34A853", // ✅ Routine
    primary: "#1A73E8", // MedGemma Blue (CTAs)
    surface: "#F8F9FA",
    card: "#FFFFFF",
    text: "#1A1A1A",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radii: { sm: 8, md: 12, lg: 20, full: 9999 },
  shadows: {
    card: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
    elevated: "0 4px 12px rgba(0,0,0,0.15)",
  },
} as const;

export type ClinicalTokens = typeof tokens;
