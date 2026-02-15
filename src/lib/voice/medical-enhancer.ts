/**
 * Pediatric-specific speech-to-clinical-term enhancement for developmental screening.
 * Maps common parent phrases to clinical terminology for MedGemma analysis.
 */

export interface MedicalEntity {
  entity: string;
  confidence: number;
  category: 'symptom' | 'milestone' | 'concern';
}

// Common parent phrases → clinical terms
const pediatricPatterns: Record<string, string> = {
  'says about': 'reports expressive vocabulary of',
  'doesnt say': 'limited verbal output',
  "doesn't say": 'limited verbal output',
  'only a few': 'reduced vocabulary size',
  'not walking': 'delayed gross motor',
  'no eye contact': 'reduced joint attention',
  'lines up toys': 'repetitive behavior pattern',
  'says': 'speech production',
  'words': 'vocabulary size',
  'talk': 'expressive language',
  'walk': 'gross motor',
  'crawl': 'locomotor development',
  'name': 'joint attention',
  'eye': 'eye contact',
  'smile': 'social reciprocity',
  'stack': 'fine motor',
  'draw': 'grasp development',
  'point': 'referential pointing',
  'follow': 'receptive language',
  'instructions': 'receptive language',
};

/**
 * Enhances raw transcript with pediatric clinical terminology.
 */
export function enhanceMedicalTranscript(text: string): string {
  if (!text?.trim()) return text;
  let enhanced = text;
  // Sort by length descending so longer phrases match first
  const entries = Object.entries(pediatricPatterns).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [term, medical] of entries) {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
    enhanced = enhanced.replace(regex, medical);
  }
  return enhanced;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts medical entities (milestones, concerns) from transcript for domain hints.
 */
export function extractMedicalEntities(transcript: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  const lower = transcript.toLowerCase();

  const milestones: Record<string, string[]> = {
    language: ['words', 'talk', 'name', 'point', 'sentences', 'vocabulary', 'speech'],
    motor: ['walk', 'crawl', 'stack', 'draw', 'throw', 'run', 'climb'],
    social: ['smile', 'eye', 'play', 'share', 'hug', 'wave', 'point'],
    cognitive: ['stack', 'sort', 'match', 'count', 'puzzle'],
  };

  for (const [domain, keywords] of Object.entries(milestones)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > 0) {
      entities.push({
        entity: domain,
        confidence: Math.min(score / keywords.length, 1.0),
        category: 'milestone',
      });
    }
  }

  // Concern patterns
  const concernPatterns = [
    { pattern: /doesn't|doesnt|not yet|delayed|limited|reduced|no /i, category: 'concern' as const },
  ];
  for (const { pattern, category } of concernPatterns) {
    if (pattern.test(transcript)) {
      entities.push({ entity: 'developmental_concern', confidence: 0.7, category });
      break;
    }
  }

  return entities;
}

/**
 * Suggests screening domain from transcript entities.
 */
export function suggestDomainFromTranscript(transcript: string): string | null {
  const entities = extractMedicalEntities(transcript);
  if (entities.length === 0) return null;
  const top = entities.sort((a, b) => b.confidence - a.confidence)[0];
  const domainMap: Record<string, string> = {
    language: 'communication',
    motor: 'gross_motor',
    social: 'social',
    cognitive: 'cognitive',
  };
  return domainMap[top.entity] ?? null;
}
