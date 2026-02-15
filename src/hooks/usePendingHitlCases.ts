/**
 * usePendingHitlCases — React Query hook for HITL case queue
 * Fetches screenings/cases pending clinician review; integrates with real-time WebSocket updates
 */
import { useQuery } from "@tanstack/react-query";
import { listScreenings } from "@/services/screeningApi";
import type { ScreeningListItem } from "@/services/screeningApi";

export interface PendingHitlCase {
  caseId: string;
  screening_id: string;
  risk: string;
  confidence?: number;
  observations: string | null;
  createdAt: string;
  report?: { riskLevel?: string; summary?: string; keyFindings?: string[] };
}

function toPendingCase(item: ScreeningListItem): PendingHitlCase {
  const risk = item.report?.riskLevel || "unknown";
  return {
    caseId: item.id,
    screening_id: item.screening_id,
    risk,
    observations: item.observations,
    createdAt: item.created_at,
    report: item.report,
  };
}

export function usePendingHitlCases(options?: {
  limit?: number;
  page?: number;
  refetchInterval?: number;
}) {
  const { limit = 50, page = 0, refetchInterval = 30000 } = options ?? {};

  const query = useQuery({
    queryKey: ["hitl-pending", limit, page],
    queryFn: () => listScreenings({ limit, page }),
    refetchInterval,
    staleTime: 10000,
  });

  const items = (query.data?.items ?? []).map(toPendingCase);

  const byRisk = {
    discuss: items.filter((c) => c.risk === "refer" || c.risk === "high"),
    elevated: items.filter((c) => c.risk === "monitor" || c.risk === "medium"),
    monitor: items.filter((c) => c.risk === "on_track" || c.risk === "low"),
  };

  return {
    ...query,
    cases: items,
    byRisk,
    highPriority: byRisk.discuss.length,
    mediumPriority: byRisk.elevated.length,
    lowPriority: byRisk.monitor.length,
  };
}
