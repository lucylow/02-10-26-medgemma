/**
 * MedGemma-themed Button — uses design tokens from ThemeContext
 */
import React, { useContext } from "react";
import { ThemeContext } from "@/theme";

export interface MedGemmaButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  children: React.ReactNode;
}

export const MedGemmaButton: React.FC<MedGemmaButtonProps> = ({
  children,
  variant = "primary",
  ...props
}) => {
  const t = useContext(ThemeContext);
  const styles: React.CSSProperties = {
    background:
      variant === "primary"
        ? t.colors.primaryBlue
        : variant === "secondary"
          ? t.colors.surfaceLight
          : "transparent",
    color:
      variant === "primary"
        ? t.colors.white
        : t.colors.primaryBlue,
    borderRadius: t.radii.md,
    padding: `${t.spacing.sm}px ${t.spacing.md}px`,
    border:
      variant === "outline"
        ? `2px solid ${t.colors.primaryBlue}`
        : "none",
    fontFamily: t.typography.body.fontFamily,
    fontSize: t.typography.body.size,
    fontWeight: t.typography.body.weight,
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.6 : 1,
  };
  return (
    <button style={styles} {...props}>
      {children}
    </button>
  );
};
