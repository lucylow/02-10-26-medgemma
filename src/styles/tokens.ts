/**
 * Design tokens for PediScreen AI / MedGemma palette
 * Aligned with Google MedGemma branding and clinical-grade aesthetics
 */

export const colors = {
  primary: "#1A73E8",
  secondary: "#4285F4",
  accent: "#00BCD4",
  success: "#34A853",
  warning: "#FBBC05",
  danger: "#EA4335",
  text: "#202124",
  muted: "#5F6368",
  bg: "#F8F9FA",
  border: "#DADCE0",
} as const;

export const typography = {
  fontFamily: {
    sans: '"Inter", "Segoe UI", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  },
} as const;

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "2.5rem",
  "3xl": "3rem",
} as const;

export const radius = {
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1400px",
} as const;
