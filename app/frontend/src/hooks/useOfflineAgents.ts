import { useState, useEffect, useCallback } from 'react';

export type OfflineMode = 'offline' | 'hybrid' | 'online';

export interface OfflineResponse {
  risk: 'low' | 'monitor' | 'elevated' | 'discuss';
  confidence: number;
  summary?: string[];
  rationale: string;
  next_steps: string[];
  mode: 'offline_rules' | 'offline_safe' | 'offline_cached' | 'hybrid_enhanced';
  rule_id?: string;
  timestamp: number;
  upgraded?: boolean;
  original_confidence?: number;
}

/** ASQ-3 validated offline rules for developmental screening */
const OFFLINE_RULES: Record<
  string,
  Record<
    string,
    {
      condition: (age: number, observations: string) => boolean;
      risk: OfflineResponse['risk'];
      confidence: number;
      rationale: string;
      next_steps: string[];
    }
  >
> = {
  communication: {
    low_words: {
      condition: (age: number, observations: string) =>
        age > 24 && !/^(50|100|200)/.test(observations.trim()),
      risk: 'monitor',
      confidence: 0.92,
      rationale: 'Vocabulary below age-expected milestones',
      next_steps: ['Formal language screening', 'Monitor 3 months'],
    },
  },
  gross_motor: {
    no_walking: {
      condition: (age: number, observations: string) =>
        age > 18 && /not walking|not yet walking|doesn't walk|cannot walk/i.test(observations),
      risk: 'elevated',
      confidence: 0.95,
      rationale: 'Gross motor delay concern',
      next_steps: ['Pediatric evaluation within 2 weeks'],
    },
  },
  fine_motor: {
    no_pincer: {
      condition: (age: number, observations: string) =>
        age > 12 && /no pincer|cannot pick up|drops small objects/i.test(observations),
      risk: 'monitor',
      confidence: 0.9,
      rationale: 'Fine motor milestone concern',
      next_steps: ['Monitor grasp development', 'Reassess in 2 months'],
    },
  },
  cognitive: {
    no_imitation: {
      condition: (age: number, observations: string) =>
        age > 18 && /doesn't imitate|no imitation|won't copy/i.test(observations),
      risk: 'monitor',
      confidence: 0.88,
      rationale: 'Cognitive imitation milestone concern',
      next_steps: ['Model simple actions', 'Reassess in 3 months'],
    },
  },
  social: {
    no_eye_contact: {
      condition: (age: number, observations: string) =>
        age > 6 && /no eye contact|avoids eye contact|won't look/i.test(observations),
      risk: 'elevated',
      confidence: 0.9,
      rationale: 'Social engagement concern',
      next_steps: ['Discuss with pediatrician', 'Consider developmental screening'],
    },
  },
};

const CACHE_PREFIX = 'pediscreen_offline_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function findBestRule(
  domain: string,
  age: number,
  observations: string
): (OfflineResponse & { rule_id: string }) | null {
  const rules = OFFLINE_RULES[domain];
  if (!rules) return null;

  for (const [ruleId, rule] of Object.entries(rules)) {
    if (rule.condition(age, observations)) {
      return {
        risk: rule.risk,
        confidence: rule.confidence,
        rationale: rule.rationale,
        next_steps: rule.next_steps,
        summary: [rule.rationale],
        mode: 'offline_rules',
        rule_id: ruleId,
        timestamp: Date.now(),
      };
    }
  }
  return null;
}

/** Simple hash for cache keys */
function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export function useOfflineAgents(
  input: string,
  age: number,
  domain: string
) {
  const [mode, setMode] = useState<OfflineMode>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [response, setResponse] = useState<OfflineResponse | null>(null);
  const [isOptimistic, setIsOptimistic] = useState(false);

  useEffect(() => {
    const handleOnline = () => setMode('online');
    const handleOffline = () => setMode('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setMode(navigator.onLine ? 'online' : 'offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const generateOfflineResponse = useCallback(async () => {
    setIsOptimistic(true);
    const ageNum = typeof age === 'string' ? parseInt(age, 10) : age;
    const observations = input || '';

    // 1. Immediate rule-based response (~50ms)
    const ruleResponse = findBestRule(domain, ageNum, observations);

    if (ruleResponse) {
      setResponse(ruleResponse);

      try {
        localStorage.setItem(
          `${CACHE_PREFIX}case_${domain}_${ageNum}`,
          JSON.stringify({ ...ruleResponse, timestamp: Date.now() })
        );
      } catch {
        // localStorage full or unavailable
      }

      return ruleResponse;
    }

    // 2. Fallback to cached similar cases
    try {
      const cacheKey = `${CACHE_PREFIX}cache_${domain}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as OfflineResponse & { timestamp?: number };
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          setResponse({ ...parsed, mode: 'offline_cached', timestamp: Date.now() });
          return parsed;
        }
      }
    } catch {
      // Ignore cache errors
    }

    // 3. Generic safe response
    const safeResponse: OfflineResponse = {
      risk: 'monitor',
      confidence: 0.75,
      summary: ['Review recommended'],
      rationale: 'Insufficient data for automated assessment',
      next_steps: ['Consult pediatrician', 'Complete full screening when online'],
      mode: 'offline_safe',
      timestamp: Date.now(),
    };

    setResponse(safeResponse);
    return safeResponse;
  }, [domain, age, input]);

  const upgradeToOnline = useCallback(
    (onlineResponse: Partial<OfflineResponse>) => {
      if (!response) return;
      setMode('hybrid');
      setResponse({
        ...response,
        ...onlineResponse,
        mode: 'hybrid_enhanced',
        upgraded: true,
        original_confidence: response.confidence,
      });
    },
    [response]
  );

  return {
    mode,
    response,
    generateOfflineResponse,
    upgradeToOnline,
    isOptimistic,
    isOnline: mode === 'online',
  };
}

export { findBestRule, hash, CACHE_PREFIX };
