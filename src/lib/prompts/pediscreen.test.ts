import { describe, it, expect } from 'vitest';
import {
  buildInferPrompt,
  PEDISCREEN_PROMPT_V2,
  RISK_LEVELS,
  extractJsonFromModelOutput,
  parseAndValidateReport,
} from './pediscreen';

describe('pediscreen prompts', () => {
  it('PEDISCREEN_PROMPT_V2 contains schema and placeholders', () => {
    expect(PEDISCREEN_PROMPT_V2).toContain('riskLevel');
    expect(PEDISCREEN_PROMPT_V2).toContain('reasoningChain');
    expect(PEDISCREEN_PROMPT_V2).toContain('{age_months}');
    expect(PEDISCREEN_PROMPT_V2).toContain('{domain}');
    expect(PEDISCREEN_PROMPT_V2).toContain('{observations}');
    expect(PEDISCREEN_PROMPT_V2).toContain('{embedding_analysis}');
  });

  it('buildInferPrompt replaces all placeholders', () => {
    const out = buildInferPrompt({
      age_months: 24,
      domain: 'communication',
      observations: 'Few words at 24mo',
      embedding_analysis: 'similar to referral cases',
    });
    expect(out).toContain('24');
    expect(out).toContain('communication');
    expect(out).toContain('Few words at 24mo');
    expect(out).not.toContain('{age_months}');
    expect(out).not.toContain('{domain}');
    expect(out).not.toContain('{observations}');
    expect(out).toContain('similar to referral cases');
  });

  it('buildInferPrompt uses defaults for optional fields', () => {
    const out = buildInferPrompt({
      age_months: 12,
      domain: '',
      observations: 'ok',
    });
    expect(out).toContain('general'); // domain default
    expect(out).toContain('none'); // embedding_analysis default
  });

  it('RISK_LEVELS includes expected values', () => {
    expect(RISK_LEVELS).toContain('referral');
    expect(RISK_LEVELS).toContain('monitor');
    expect(RISK_LEVELS).toContain('ontrack');
    expect(RISK_LEVELS).toContain('urgent');
  });
});

describe('extractJsonFromModelOutput', () => {
  it('extracts raw JSON object', () => {
    const text = 'Here is the result:\n{"riskLevel":"monitor","reasoningChain":["Step 1"]}';
    expect(extractJsonFromModelOutput(text)).toBe('{"riskLevel":"monitor","reasoningChain":["Step 1"]}');
  });

  it('extracts from markdown code block', () => {
    const text = '```json\n{"riskLevel":"referral","reasoningChain":[]}\n```';
    expect(extractJsonFromModelOutput(text)).toBe('{"riskLevel":"referral","reasoningChain":[]}');
  });

  it('returns null when no JSON present', () => {
    expect(extractJsonFromModelOutput('No JSON here')).toBeNull();
    expect(extractJsonFromModelOutput('')).toBeNull();
  });
});

describe('parseAndValidateReport', () => {
  it('accepts valid report', () => {
    const raw = {
      riskLevel: 'referral',
      reasoningChain: ['Step 1', 'Step 2'],
      confidence: 0.9,
      summary: 'S',
      parentSummary: 'P',
      evidence: [],
      recommendations: [],
    };
    const report = parseAndValidateReport(raw);
    expect(report).not.toBeNull();
    expect(report!.riskLevel).toBe('referral');
    expect(report!.reasoningChain).toEqual(['Step 1', 'Step 2']);
    expect(report!.confidence).toBe(0.9);
  });

  it('rejects invalid riskLevel', () => {
    expect(parseAndValidateReport({ riskLevel: 'invalid', reasoningChain: [] })).toBeNull();
    expect(parseAndValidateReport({ reasoningChain: [] })).toBeNull();
  });

  it('rejects missing reasoningChain', () => {
    expect(parseAndValidateReport({ riskLevel: 'monitor' })).toBeNull();
    expect(parseAndValidateReport({ riskLevel: 'monitor', reasoningChain: 'not array' })).toBeNull();
  });

  it('rejects non-object', () => {
    expect(parseAndValidateReport(null)).toBeNull();
    expect(parseAndValidateReport('string')).toBeNull();
  });
});
