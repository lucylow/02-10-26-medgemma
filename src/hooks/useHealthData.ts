// src/hooks/useHealthData.ts - Real-time vitals + developmental trends
import { useState, useEffect, useCallback } from "react";

export interface VitalDataPoint {
  timestamp: number;
  heartRate: number;
  respiratoryRate: number;
  temperature: number;
  oxygenSaturation: number;
}

export interface DevelopmentalData {
  ageMonths: number;
  asq3Score: number;
  languagePercentile: number;
  motorPercentile: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export function useHealthData() {
  const [vitalsHistory, setVitalsHistory] = useState<VitalDataPoint[]>([]);
  const [developmentalHistory, setDevelopmentalHistory] = useState<DevelopmentalData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorIntervalId, setMonitorIntervalId] = useState<number | null>(null);

  // Simulate real-time rPPG (forehead camera) data
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    const interval = window.setInterval(() => {
      const now = Date.now();
      const newVital: VitalDataPoint = {
        timestamp: now,
        heartRate: 80 + Math.sin(now / 10000) * 20 + (Math.random() - 0.5) * 10,
        respiratoryRate: 20 + Math.sin(now / 15000) * 8 + (Math.random() - 0.5) * 4,
        temperature: 98.6 + (Math.random() - 0.5) * 0.4,
        oxygenSaturation: 97 + Math.random() * 2,
      };

      setVitalsHistory((prev) => {
        const recent = [...prev, newVital].slice(-60); // Last 60s
        return recent;
      });
    }, 1000); // 1s intervals

    setMonitorIntervalId(interval);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (monitorIntervalId !== null) {
      window.clearInterval(monitorIntervalId);
      setMonitorIntervalId(null);
    }
  }, [monitorIntervalId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitorIntervalId !== null) {
        window.clearInterval(monitorIntervalId);
      }
    };
  }, [monitorIntervalId]);

  // Mock longitudinal developmental data
  useEffect(() => {
    const mockDevData: DevelopmentalData[] = [
      { ageMonths: 12, asq3Score: 85, languagePercentile: 45, motorPercentile: 72, riskLevel: "LOW" },
      { ageMonths: 18, asq3Score: 82, languagePercentile: 38, motorPercentile: 68, riskLevel: "MEDIUM" },
      { ageMonths: 24, asq3Score: 78, languagePercentile: 28, motorPercentile: 65, riskLevel: "MEDIUM" },
      { ageMonths: 30, asq3Score: 88, languagePercentile: 42, motorPercentile: 78, riskLevel: "LOW" },
    ];
    setDevelopmentalHistory(mockDevData);
  }, []);

  return {
    vitalsHistory,
    developmentalHistory,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    latestVitals: vitalsHistory[vitalsHistory.length - 1],
  };
}

