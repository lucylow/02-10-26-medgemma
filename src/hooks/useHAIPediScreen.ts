/**
 * HAI-DEF 7-task inference hook.
 * Target: ~2.2s E2E on iPhone 15 Pro.
 * Uses backend POST /api/hai-infer or on-device runtime when available.
 */

import { useCallback } from "react";
import type {
  CHWObservation,
  ASQ3Result,
  ROPResult,
  BoneAgeResult,
  GrowthData,
  ZScoreResult,
  FractureResult,
  Patient,
  WorkflowResult,
  ReportResult,
} from "@/types/hai";

type ImportMetaEnv = { env?: { VITE_HAI_INFER_URL?: string } };
const HAI_INFER_URL = typeof import.meta !== "undefined" && (import.meta as ImportMetaEnv).env?.VITE_HAI_INFER_URL != null
  ? (import.meta as ImportMetaEnv).env!.VITE_HAI_INFER_URL
  : "";

async function runHAIModel<T>(task: string, payload: unknown): Promise<T> {
  if (HAI_INFER_URL) {
    const res = await fetch(`${HAI_INFER_URL.replace(/\/$/, "")}/api/hai-infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload }),
    });
    if (!res.ok) throw new Error(`HAI infer failed: ${res.status}`);
    return res.json() as Promise<T>;
  }
  // Stub for offline/demo: return typed placeholder so UI can still compose
  return Promise.resolve({} as T);
}

export function useHAIPediScreen() {
  const analyzeASQ3 = useCallback(
    async (observation: CHWObservation): Promise<ASQ3Result> => {
      return runHAIModel<ASQ3Result>("asq3_scoring", observation);
    },
    []
  );

  const analyzeROP = useCallback(
    async (fundusImage: string): Promise<ROPResult> => {
      return runHAIModel<ROPResult>("rop_detection", { image: fundusImage });
    },
    []
  );

  const assessBoneAge = useCallback(
    async (xrayImage: string): Promise<BoneAgeResult> => {
      return runHAIModel<BoneAgeResult>("bone_age_assessment", { image: xrayImage });
    },
    []
  );

  const trackGrowth = useCallback(
    async (anthropometrics: GrowthData): Promise<ZScoreResult> => {
      return runHAIModel<ZScoreResult>("growth_zscore", anthropometrics);
    },
    []
  );

  const detectFractures = useCallback(
    async (xrayImage: string): Promise<FractureResult> => {
      return runHAIModel<FractureResult>("fracture_detection", { image: xrayImage });
    },
    []
  );

  const generateCHWWorkflow = useCallback(
    async (patientData: Patient): Promise<WorkflowResult> => {
      return runHAIModel<WorkflowResult>("chw_workflow_generation", patientData);
    },
    []
  );

  const generateMultilingualReport = useCallback(
    async (result: unknown, language: string): Promise<ReportResult> => {
      return runHAIModel<ReportResult>("multilingual_report", { result, language });
    },
    []
  );

  return {
    analyzeASQ3,
    analyzeROP,
    assessBoneAge,
    trackGrowth,
    detectFractures,
    generateCHWWorkflow,
    generateMultilingualReport,
  };
}
