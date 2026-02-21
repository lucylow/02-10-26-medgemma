/**
 * Build location.state for ResultsScreen from a mock case (mock_data shape).
 * Used by ResultScreen.stories and tests.
 */
import type { ScreeningResult } from '@/services/screeningApi';

type MockInference = {
  summary?: string[];
  risk?: string;
  recommendations?: string[];
  parent_text?: string;
  explainability?: { type: string; detail: string; score?: number }[];
  confidence?: number;
};

function mapRiskLevel(risk: string): ScreeningResult['report'] extends { riskLevel: infer R } ? R : string {
  const r = (risk || 'unknown').toLowerCase();
  if (r === 'on_track' || r === 'low') return 'on_track';
  if (r === 'monitor' || r === 'medium') return 'monitor';
  if (r === 'refer' || r === 'high') return 'refer';
  return 'unknown';
}

export function mockInferenceToReport(mi: MockInference): NonNullable<ScreeningResult['report']> {
  const riskLevel = mapRiskLevel(mi.risk || 'unknown');
  const summary = Array.isArray(mi.summary) ? mi.summary.join(' ') : (mi.summary ?? '');
  return {
    riskLevel,
    summary,
    parentFriendlyExplanation: mi.parent_text,
    keyFindings: (mi.explainability || []).map((e) => e.detail || e.type),
    recommendations: mi.recommendations || [],
    supportingEvidence: {
      fromParentReport: (mi.explainability || []).filter((e) => e.type === 'text').map((e) => e.detail),
      fromAssessmentScores: [],
      fromVisualAnalysis: [],
    },
    modelEvidence: (mi.explainability || []).map((e) => ({ type: e.type, content: e.detail, influence: e.score })),
  };
}

export function caseToResultState(caseData: { case_id: string; mock_inference?: MockInference }) {
  const mi = caseData.mock_inference;
  const report = mi ? mockInferenceToReport(mi) : mockInferenceToReport({ risk: 'on_track', confidence: 0.5, summary: [] });
  return {
    screeningId: `demo_${caseData.case_id}_${Date.now()}`,
    report,
    childAge: '24',
    domain: 'communication',
    confidence: mi?.confidence ?? 0.7,
    imagePreview: null,
    modelUsed: true,
    modelParseOk: true,
  };
}
