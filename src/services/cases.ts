/**
 * Cases service - case queue and case detail API
 * Uses screeningApi for screening data; extends for case management
 */

import { apiClient } from "./apiClient";
import type { ScreeningListItem } from "./screeningApi";

export interface CaseSummary {
  cases_pending: number;
  high_priority: number;
  reviewed: number;
  avg_review_time: number;
  weekly_throughput: Array<{ week: string; count: number }>;
}

/**
 * Fetch dashboard summary (placeholder - backend /summary endpoint)
 */
export async function getSummary(): Promise<CaseSummary> {
  try {
    return await apiClient<CaseSummary>("/api/summary");
  } catch {
    return {
      cases_pending: 0,
      high_priority: 0,
      reviewed: 0,
      avg_review_time: 0,
      weekly_throughput: [],
    };
  }
}

/**
 * List cases with pagination (delegates to screeningApi when available)
 */
export async function listCases(params?: {
  limit?: number;
  page?: number;
  priority?: string;
  domain?: string;
}): Promise<{ items: ScreeningListItem[] }> {
  const { listScreenings } = await import("./screeningApi");
  return listScreenings({ limit: params?.limit, page: params?.page });
}
