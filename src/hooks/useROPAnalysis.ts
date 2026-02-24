import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ROPAnalysisInput {
  imageDataUrl: string;
  gestationalAgeWeeks?: number;
  birthWeightGrams?: number;
  postnatalAgeWeeks?: number;
  caseId?: string;
}

export interface ROPAnalysisResult {
  zone: string;
  stage: string;
  plus_disease: boolean;
  aggressive_posterior: boolean;
  confidence: number;
  risk_level: "normal" | "pre-threshold" | "threshold" | "urgent";
  findings: string[];
  recommendation: string;
  urgency_hours: number | null;
  icd10: string;
  is_mock: boolean;
  model: string;
}

function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export function useROPAnalysis() {
  return useMutation<ROPAnalysisResult, Error, ROPAnalysisInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke("rop-analyze", {
        body: {
          image_b64: dataUrlToBase64(input.imageDataUrl),
          gestational_age_weeks: input.gestationalAgeWeeks,
          birth_weight_grams: input.birthWeightGrams,
          postnatal_age_weeks: input.postnatalAgeWeeks,
          case_id: input.caseId,
        },
      });
      if (error) throw new Error(error.message);
      return data as ROPAnalysisResult;
    },
  });
}
