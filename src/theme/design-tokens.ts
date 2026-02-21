/**
 * Design tokens — single source of truth for MedGemma / PediScreen UX.
 * Use these (or ThemeContext) everywhere; avoid inline hex/spacing in components.
 */

export const colors = {
  primary: "#1A73E8",
  secondary: "#4285F4",
  accentTeal: "#00BCD4",
  success: "#34A853",
  warning: "#FBBC05",
  alert: "#EA4335",
  surface: "#F8F9FA",
  card: "#FFFFFF",
  text: "#202124",
  muted: "#5F6368",
  divider: "#E8EAED",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;
export const radii = { sm: 8, md: 12, lg: 20 } as const;

export const typography = {
  title: {
    fontFamily: "Poppins, system-ui, sans-serif",
    fontSize: 36,
    fontWeight: 700,
  },
  body: {
    fontFamily: "Roboto, system-ui, sans-serif",
    fontSize: 16,
    lineHeight: 1.4,
  },
  small: {
    fontFamily: "Roboto, system-ui, sans-serif",
    fontSize: 14,
    lineHeight: 1.4,
  },
} as const;

/** Risk chip colors for low / monitor / high / refer */
export const riskColors = {
  low: colors.success,
  monitor: colors.warning,
  high: colors.warning,
  refer: colors.alert,
} as const;

export type RiskLevel = keyof typeof riskColors;
