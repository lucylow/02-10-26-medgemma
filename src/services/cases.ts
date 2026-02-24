/**
 * Cases service - case queue and case detail API
 * Uses screeningApi for screening data; extends for case management
 */

import type { ScreeningListItem } from "./screeningApi";
import { listScreenings } from "./screeningApi";

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
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('screenings')
      .select('risk_level, status')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) {
      const pending = data.filter(d => d.status === 'created' || d.status === 'analyzing').length;
      const highPriority = data.filter(d => d.risk_level === 'high' || d.risk_level === 'refer').length;
      const reviewed = data.filter(d => d.status === 'complete').length;
      return {
        cases_pending: pending,
        high_priority: highPriority,
        reviewed,
        avg_review_time: 0,
        weekly_throughput: [],
      };
    }
  } catch {
    // fall through
  }
  return {
    cases_pending: 0,
    high_priority: 0,
    reviewed: 0,
    avg_review_time: 0,
    weekly_throughput: [],
  };
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
  return listScreenings({ limit: params?.limit, page: params?.page });
}
