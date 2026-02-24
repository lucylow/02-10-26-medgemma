/**
 * Theme configuration - exports design tokens for runtime use
 * CSS variables are defined in index.css / globals.css
 */

import { tokens } from "./tokens";

export const theme = {
  ...tokens,
} as const;

export type Theme = typeof theme;
