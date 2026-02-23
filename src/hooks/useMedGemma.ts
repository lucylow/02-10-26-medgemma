/**
 * React Query hooks for MedGemma + Lovable Cloud AI integration.
 * Uses Supabase Edge Functions via the Supabase client for auth/CORS.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  MedGemmaRequest,
  MedGemmaScreeningResult,
  ParentNotesResult,
  WearableMetrics,
  WearableRiskResult,
} from "@/types/medgemma";

// ── MedGemma Screening Analysis ─────────────────────────────────
export function useMedGemmaAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<MedGemmaScreeningResult, Error, MedGemmaRequest>({
    mutationKey: ["medgemma-analyze"],
    mutationFn: async (request) => {
      const { data, error } = await supabase.functions.invoke("medgemma-analyze", {
        body: {
          childAge: request.childAge,
          domains: request.domains,
          observations: request.observations,
          wearable: request.wearable,
          consent_id: request.consent_id,
          case_id: request.case_id,
        },
      });

      if (error) throw new Error(error.message || "Analysis failed");
      if (!data?.success) throw new Error(data?.message || "Analysis returned unsuccessful result");
      return data as MedGemmaScreeningResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
    },
  });
}

// ── Parent Notes AI Analysis ────────────────────────────────────
export function useParentNotesAnalysis() {
  return useMutation<ParentNotesResult, Error, { notes: string; childAgeMonths?: number }>({
    mutationKey: ["parent-notes"],
    mutationFn: async ({ notes, childAgeMonths }) => {
      const { data, error } = await supabase.functions.invoke("parent-notes", {
        body: { notes, childAgeMonths },
      });

      if (error) throw new Error(error.message || "Parent notes analysis failed");
      return data as ParentNotesResult;
    },
  });
}

// ── Wearable Risk Assessment ────────────────────────────────────
export function useWearableRisk(metrics?: WearableMetrics, childAgeMonths?: number) {
  return useQuery<WearableRiskResult>({
    queryKey: ["wearable-risk", metrics],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("wearable-risk", {
        body: { metrics, childAgeMonths },
      });

      if (error) throw new Error(error.message || "Wearable assessment failed");
      return data as WearableRiskResult;
    },
    enabled: !!metrics && !!metrics.hrvRmssd,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Screening History ───────────────────────────────────────────
export function useScreeningHistory(limit = 20) {
  return useQuery({
    queryKey: ["screenings", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screenings")
        .select("id, screening_id, child_age_months, domain, risk_level, confidence, is_mock, created_at, report")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });
}

// ── Single Screening Detail ─────────────────────────────────────
export function useScreeningDetail(screeningId: string | undefined) {
  return useQuery({
    queryKey: ["screening", screeningId],
    queryFn: async () => {
      if (!screeningId) throw new Error("No screening ID");
      const { data, error } = await supabase
        .from("screenings")
        .select("*")
        .eq("screening_id", screeningId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!screeningId,
  });
}
