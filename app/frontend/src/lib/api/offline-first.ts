import { findBestRule, hash } from '@/hooks/useOfflineAgents';
import type { OfflineResponse } from '@/hooks/useOfflineAgents';
import { streamScreening } from '@/services/screeningApi';
import type { StreamScreeningRequest, ScreeningResult } from '@/services/screeningApi';

const CACHE_PREFIX = 'pediscreen_offline_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ProcessCaseInput {
  domain: string;
  age: number;
  observations: string;
  imageFile?: File | null;
}

function generateOfflineResponse(data: ProcessCaseInput): OfflineResponse {
  const ruleResponse = findBestRule(data.domain, data.age, data.observations);

  if (ruleResponse) {
    return ruleResponse;
  }

  return {
    risk: 'monitor',
    confidence: 0.75,
    summary: ['Review recommended'],
    rationale: 'Insufficient data for automated assessment',
    next_steps: ['Consult pediatrician', 'Complete full screening when online'],
    mode: 'offline_safe',
    timestamp: Date.now(),
  };
}

function getCacheKey(data: ProcessCaseInput): string {
  return `${CACHE_PREFIX}case_${data.domain}_${data.age}_${hash(data.observations)}`;
}

/**
 * Network-resilient offline-first API client.
 * 1. Try cache first (~10ms)
 * 2. Generate offline rule-based response (~50ms)
 * 3. Queue for online processing when connected
 */
class OfflineFirstAPI {
  private cache = new Map<string, OfflineResponse & { report?: ScreeningResult }>();
  private queue: Array<{ key: string; data: ProcessCaseInput }> = [];

  async processCase(data: ProcessCaseInput): Promise<OfflineResponse & { report?: ScreeningResult }> {
    const cacheKey = getCacheKey(data);

    // 1. Try cache first (~10ms)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as OfflineResponse & { timestamp?: number };
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return { ...parsed, timestamp: Date.now() };
        }
      }
    } catch {
      // Ignore
    }

    // 2. Offline rules (~50ms)
    const offlineResponse = generateOfflineResponse(data);
    const result: OfflineResponse & { report?: ScreeningResult } = {
      ...offlineResponse,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // localStorage full
    }
    this.cache.set(cacheKey, result);

    // 3. Queue for online processing when connected
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processOnline(data, cacheKey);
    } else {
      this.queue.push({ key: cacheKey, data });
    }

    return result;
  }

  private async processOnline(data: ProcessCaseInput, cacheKey: string): Promise<void> {
    try {
      const request: StreamScreeningRequest = {
        childAge: String(data.age),
        domain: data.domain,
        observations: data.observations,
        imageFile: data.imageFile ?? undefined,
      };

      const report = await new Promise<ScreeningResult | null>((resolve, reject) => {
        streamScreening(request, () => {}).then(resolve).catch(reject);
      });

      if (report?.report) {
        const cached = this.cache.get(cacheKey);
        const upgraded = {
          ...cached,
          ...mapReportToOfflineResponse(report.report),
          upgraded: true,
          mode: 'hybrid_enhanced' as const,
          timestamp: Date.now(),
          report,
        };

        try {
          localStorage.setItem(cacheKey, JSON.stringify(upgraded));
        } catch {
          // Ignore
        }
        this.cache.set(cacheKey, upgraded);
      }
    } catch {
      // Online processing failed, keep offline response
    }
  }

  async processQueue(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine && this.queue.length > 0) {
      const items = [...this.queue];
      this.queue = [];
      await Promise.all(
        items.map(({ key, data }) => this.processOnline(data, key))
      );
    }
  }
}

function mapReportToOfflineResponse(report: NonNullable<ScreeningResult['report']>): Partial<OfflineResponse> {
  const riskMap: Record<string, OfflineResponse['risk']> = {
    on_track: 'low',
    low: 'low',
    monitor: 'monitor',
    medium: 'monitor',
    refer: 'elevated',
    high: 'discuss',
  };
  const risk = riskMap[report.riskLevel?.toLowerCase() ?? ''] ?? 'monitor';

  return {
    risk,
    confidence: 0.92,
    rationale: report.riskRationale ?? report.summary ?? '',
    summary: report.summary
      ? [report.summary, ...(report.keyFindings ?? [])].filter(Boolean) as string[]
      : (report.keyFindings ?? []),
    next_steps: report.recommendations ?? [],
  };
}

export const offlineFirstApi = new OfflineFirstAPI();
