import React, { createContext, useState, useContext, ReactNode } from 'react';

export type ScreeningData = {
  childAge: string;
  domain: string;
  observations: string;
  imageFile: File | null;
  imagePreview: string | null;
  screeningId?: string;
};

export type ScreeningReport = {
  riskLevel: string;
  summary: string;
  keyFindings?: string[];
  recommendations?: string[];
};

type ScreeningContextType = {
  currentScreening: ScreeningData;
  updateScreening: (updates: Partial<ScreeningData>) => void;
  clearScreening: () => void;
};

const defaultScreening: ScreeningData = {
  childAge: '',
  domain: '',
  observations: '',
  imageFile: null,
  imagePreview: null,
};

const ScreeningContext = createContext<ScreeningContextType | undefined>(undefined);

export const ScreeningProvider = ({ children }: { children: ReactNode }) => {
  const [currentScreening, setCurrentScreening] = useState<ScreeningData>(defaultScreening);

  const updateScreening = (updates: Partial<ScreeningData>) => {
    setCurrentScreening(prev => ({ ...prev, ...updates }));
  };

  const clearScreening = () => {
    setCurrentScreening(defaultScreening);
  };

  return (
    <ScreeningContext.Provider 
      value={{ currentScreening, updateScreening, clearScreening }}
    >
      {children}
    </ScreeningContext.Provider>
  );
};

export const useScreening = () => {
  const context = useContext(ScreeningContext);
  if (context === undefined) {
    throw new Error('useScreening must be used within a ScreeningProvider');
  }
  return context;
};
