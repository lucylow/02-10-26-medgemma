/**
 * SmartRouter — Content-based + priority routing for PediScreen AI
 * Production patterns: urgent bypass, domain detection, default pipeline
 */

export type AgentType =
  | 'intake'
  | 'embedding'
  | 'temporal'
  | 'medgemma'
  | 'safety'
  | 'summarizer';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

const ROUTING_RULES: Record<string, RegExp[]> = {
  urgent: [
    /emergency/i,
    /seizure/i,
    /unresponsive/i,
    /breathing/i,
    /not breathing/i,
    /choking/i,
  ],
  language: [/words|says|talk|name|point|speak|vocabulary/i],
  motor: [/walk|crawl|stack|throw|grasp|climb|run|jump/i],
  social: [/eye|smile|share|play|hug|wave|point|imitate/i],
  cognitive: [/stack|sort|match|problem|solve|pretend/i],
};

const PRIORITY_RULES: Record<Priority, RegExp[]> = {
  urgent: ROUTING_RULES.urgent,
  high: [/delay|concern|worry|worried|regression/i],
  medium: [/monitor|check|follow.?up|recheck/i],
  low: [/.*/],
};

/**
 * Content-based routing: analyze input → select optimal agent pipeline
 */
export async function smartAgentRouting(
  input: string,
  _age: number
): Promise<AgentType[]> {
  const lowerInput = input.toLowerCase().trim();

  // PRIORITY ROUTING FIRST — emergency bypass
  if (ROUTING_RULES.urgent.some((regex) => regex.test(lowerInput))) {
    return ['intake', 'safety'];
  }

  // CONTENT-BASED ROUTING — detect developmental domains
  const detectedDomains = Object.entries(ROUTING_RULES)
    .filter(([domain]) => domain !== 'urgent')
    .filter(([, regexes]) => regexes.some((regex) => regex.test(lowerInput)));

  if (detectedDomains.length > 0) {
    return [
      'intake',
      'embedding',
      'temporal',
      'medgemma',
      'safety',
      'summarizer',
    ];
  }

  // DEFAULT ROUTING
  return ['intake', 'medgemma', 'safety'];
}

/**
 * Analyze input to determine clinical priority
 */
export function analyzePriority(input: string): Priority {
  const lowerInput = input.toLowerCase();

  if (PRIORITY_RULES.urgent.some((r) => r.test(lowerInput))) return 'urgent';
  if (PRIORITY_RULES.high.some((r) => r.test(lowerInput))) return 'high';
  if (PRIORITY_RULES.medium.some((r) => r.test(lowerInput))) return 'medium';

  return 'low';
}
