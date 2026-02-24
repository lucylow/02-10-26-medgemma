"use client";

import { createContext, useContext } from "react";
import { tokens, type ClinicalTokens } from "@/styles/tokens";

const ClinicalTokensContext = createContext<ClinicalTokens>(tokens);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClinicalTokensContext.Provider value={tokens}>
      {children}
    </ClinicalTokensContext.Provider>
  );
}

export const useTokens = () => useContext(ClinicalTokensContext);
