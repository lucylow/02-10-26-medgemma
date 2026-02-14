/**
 * Theme configuration - exports design tokens for runtime use
 * CSS variables are defined in index.css / globals.css
 */

import { colors, typography, spacing, radius, breakpoints } from "./tokens";

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  breakpoints,
} as const;

export type Theme = typeof theme;
