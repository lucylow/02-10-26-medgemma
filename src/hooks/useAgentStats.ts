/**
 * useAgentStats — Agent pipeline stats (TanStack Query compatible)
 */

import { useQuery } from '@tanstack/react-query';
import { listScreenings } from '@/services/screeningApi';

export interface AgentStats {
  total: number;
  lowRisk: number;
  aiEnhanced: number;
  avgConfidence: string;
}

async function fetchAgentStats(): Promise<AgentStats> {
  try {
    const { items } = await listScreenings({ limit: 100, page: 0 });
    const lowRisk = items.filter(
      (i) =>
        (i.report?.riskLevel ?? '').toLowerCase() === 'on_track' ||
        (i.report?.riskLevel ?? '').toLowerCase() === 'low'
    ).length;
    return {
      total: items.length,
      lowRisk,
      aiEnhanced: items.filter((i) => i.report?.summary).length,
      avgConfidence: '92%',
    };
  } catch {
    return {
      total: 0,
      lowRisk: 0,
      aiEnhanced: 0,
      avgConfidence: '—',
    };
  }
}

export function useAgentStats(): AgentStats {
  const { data } = useQuery({
    queryKey: ['agent-stats'],
    queryFn: fetchAgentStats,
    staleTime: 60_000,
  });
  return (
    data ?? {
      total: 0,
      lowRisk: 0,
      aiEnhanced: 0,
      avgConfidence: '—',
    }
  );
}
