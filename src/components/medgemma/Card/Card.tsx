/**
 * MedGemma-themed Card — uses design tokens
 */
import React, { useContext } from "react";
import { ThemeContext } from "@/theme";

export interface MedGemmaCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const MedGemmaCard: React.FC<MedGemmaCardProps> = ({
  children,
  title,
  className = "",
}) => {
  const t = useContext(ThemeContext);
  const styles: React.CSSProperties = {
    background: t.colors.white,
    borderRadius: t.radii.lg,
    padding: t.spacing.lg,
    border: `1px solid ${t.colors.dividerGray}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };
  return (
    <div style={styles} className={className}>
      {title && (
        <h3
          style={{
            fontFamily: t.typography.h2.fontFamily,
            fontSize: t.typography.h2.size,
            fontWeight: t.typography.h2.weight,
            color: t.colors.darkText,
            marginBottom: t.spacing.md,
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
