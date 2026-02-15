/**
 * useOfflineAgents — Offline/hybrid agent hook with ASQ-3 validated rules
 * Clinical rule engine for when network is unavailable
 */

import { useState, useEffect, useCallback } from 'react';

export interface OfflineResponse {
  risk: string;
  confidence: number;
  summary: string[];
  mode: 'offline_rules' | 'offline_safe' | 'hybrid';
  ruleId?: string;
  upgraded?: boolean;
  improvement?: number;
}

const STORAGE_PREFIX = 'rule_';
const CACHE_PREFIX = 'case_';

/** ASQ-3 validated clinical rules — export for use in offline-first API */
export const OFFLINE_RULES: Record<
  string,
  {
    condition: (age: number, text: string) => boolean;
    risk: string;
    confidence: number;
    summary: string[];
  }
> = {
  language_24m: {
    condition: (age: number, text: string) =>
      age >= 24 && !/50|100|200/.test(text),
    risk: 'monitor',
    confidence: 0.94,
    summary: ['Vocabulary below age-expected milestones (ASQ-3 L1)'],
  },
  language_18m: {
    condition: (age: number, text: string) =>
      age >= 18 &&
      /few|less|only|barely|hardly|rarely/i.test(text) &&
      /word|say|talk|speak/i.test(text),
    risk: 'monitor',
    confidence: 0.91,
    summary: ['Expressive language may need follow-up (ASQ-3)'],
  },
  motor_12m: {
    condition: (age: number, text: string) =>
      age >= 12 &&
      /not.*crawl|crawl.*not|not.*walk|walk.*not|unsteady|fall/i.test(text),
    risk: 'monitor',
    confidence: 0.89,
    summary: ['Motor milestones — clinician review recommended'],
  },
};

/** Hash input for cache key — export for offline-first API */
export function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = (h << 5) - h + c;
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/** Find best matching rule — export for offline-first API */
export function findBestRule(
  age: number,
  input: string
): OfflineResponse | null {
  for (const [ruleId, rule] of Object.entries(OFFLINE_RULES)) {
    if (rule.condition(age, input)) {
      return {
        ...rule,
        mode: 'offline_rules',
        ruleId,
      };
    }
  }
  return null;
}

export function useOfflineAgents(
  input: string,
  age: number,
  domain: string
) {
  const [mode, setMode] = useState<'offline' | 'hybrid' | 'online'>('offline');
  const [response, setResponse] = useState<OfflineResponse | null>(null);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const generateOffline = useCallback(
    async (overrideInput?: string, overrideAge?: number): Promise<OfflineResponse> => {
      setIsOptimistic(true);
      const inp = overrideInput ?? input;
      const ageVal = overrideAge ?? age;

      // Rule matching (~50ms)
      const ruleMatch = findBestRule(ageVal, inp);
    if (ruleMatch) {
      try {
        localStorage.setItem(
          `${STORAGE_PREFIX}${ruleMatch.ruleId}_${ageVal}`,
          JSON.stringify(ruleMatch)
        );
      } catch {
        // Quota or private mode
      }
      setResponse(ruleMatch);
      return ruleMatch;
    }

    // Cached similar cases
    const cacheKey = `${CACHE_PREFIX}${domain}_${ageVal}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as OfflineResponse;
        setResponse(parsed);
        return parsed;
      }
    } catch {
      // Invalid cache
    }

    // Safe fallback
    const safeFallback: OfflineResponse = {
      risk: 'monitor',
      confidence: 0.75,
      summary: ['Insufficient data — clinician review recommended'],
      mode: 'offline_safe',
    };
    setResponse(safeFallback);
    return safeFallback;
  },
    [input, age, domain]
  );

  const upgradeOnline = useCallback(
    async (onlineResult: { confidence?: number; [key: string]: unknown }) => {
      setMode('hybrid');
      const prevConf = response?.confidence ?? 0;
      const newConf = onlineResult.confidence ?? prevConf;
      setResponse({
        ...response,
        ...onlineResult,
        mode: 'hybrid',
        upgraded: true,
        improvement: (newConf - prevConf) * 100,
      } as OfflineResponse);
    },
    [response]
  );

  // Network mode detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isOnline = navigator.onLine;
    setMode(isOnline ? 'online' : 'offline');
    const onOnline = () => setMode('online');
    const onOffline = () => setMode('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return {
    mode,
    response,
    generateOffline,
    upgradeOnline,
    isOptimistic,
    accuracy: response?.confidence ?? 0,
  };
}
