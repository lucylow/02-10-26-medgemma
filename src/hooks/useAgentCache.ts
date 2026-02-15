/**
 * useAgentCache — React Query + localStorage persistence for agent cases
 * Background sync queue for offline-first workflows
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STORAGE_PREFIX = 'case_';

export interface CachedCaseData {
  caseId: string;
  [key: string]: unknown;
  synced?: boolean;
  upgraded?: boolean;
}

export function useAgentCache(caseId: string) {
  const queryClient = useQueryClient();

  const caseHistory = useQuery({
    queryKey: ['case', caseId],
    queryFn: async (): Promise<CachedCaseData | null> => {
      if (typeof window === 'undefined') return null;
      try {
        const cached = localStorage.getItem(`${STORAGE_PREFIX}${caseId}`);
        return cached ? (JSON.parse(cached) as CachedCaseData) : null;
      } catch {
        return null;
      }
    },
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const cacheCase = useMutation({
    mutationFn: async (caseData: CachedCaseData) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(
        `${STORAGE_PREFIX}${caseData.caseId}`,
        JSON.stringify(caseData)
      );
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', caseData.caseId] });
    },
  });

  const syncQueue = useMutation({
    mutationFn: async (queuedCases: CachedCaseData[]) => {
      const API_BASE =
        import.meta.env.VITE_MEDGEMMA_API_URL ||
        (import.meta.env.DEV ? 'http://localhost:8000/api' : 'https://api.pediscreen.ai/v1');

      for (const queuedCase of queuedCases) {
        try {
          const response = await fetch(`${API_BASE}/sync_case`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queuedCase),
          });

          if (response.ok) {
            await cacheCase.mutateAsync({
              ...queuedCase,
              synced: true,
              upgraded: true,
            });
          }
        } catch {
          // Keep offline version — will retry on next sync
        }
      }
    },
  });

  return {
    caseHistory,
    cacheCase,
    syncQueue,
    isSynced: caseHistory.data?.synced ?? false,
  };
}
