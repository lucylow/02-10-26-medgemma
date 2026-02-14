/**
 * Patient-friendly explanation templates.
 * Translates clinical reasoning into plain language for caregivers.
 * Per design spec: AI Explainability & Trust — Page 8.
 */

export function toPatientText(
  summary: string[],
  risk: string,
  options?: { includeDisclaimer?: boolean }
): string[] {
  const includeDisclaimer = options?.includeDisclaimer ?? true;

  const riskPhrase: Record<string, string> = {
    low: 'low',
    on_track: 'on track',
    monitor: 'some areas to watch',
    medium: 'some areas to watch',
    high: 'may benefit from follow-up',
    refer: 'may benefit from follow-up',
  };
  const r = riskPhrase[risk?.toLowerCase()] ?? risk ?? 'unclear';

  const lines: string[] = [
    `Our AI suggests a risk level of ${r}.`,
    ...(summary?.length ? summary.map((s) => `• ${s}`) : []),
  ];

  if (includeDisclaimer) {
    lines.push('This is a draft interpretation to discuss with your clinician.');
  }

  return lines;
}

/**
 * Single paragraph for parent view / print summary.
 */
export function toPatientParagraph(
  summary: string[],
  risk: string,
  options?: { includeDisclaimer?: boolean }
): string {
  return toPatientText(summary, risk, options).join(' ');
}
