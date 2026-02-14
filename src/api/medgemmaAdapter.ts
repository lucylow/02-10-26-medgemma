/**
 * Adapter: maps existing ScreeningResult to MedGemmaReport format.
 * Enables ReportPreview and MedGemma UI to work with current /api/analyze backend.
 */

import type { MedGemmaReport, MedGemmaEvidence } from './medgemma';
import type { ScreeningResult } from '@/services/screeningApi';
import { DISCLAIMER_DRAFT } from '@/constants/disclaimers';

export function mapScreeningResultToMedGemmaReport(
  result: ScreeningResult,
  screeningId: string
): MedGemmaReport {
  const report = result.report;
  if (!report) {
    return {
      reportId: screeningId,
      status: 'draft',
      clinicalSummary: 'No report available.',
      parentSummary: '',
      riskAssessment: { overall: 'Unknown', domains: {} },
      evidence: [],
      recommendations: [],
      disclaimer: DISCLAIMER_DRAFT,
    };
  }

  const evidence: MedGemmaEvidence[] = [];
  const domains: Record<string, string> = {};

  if (report.supportingEvidence) {
    report.supportingEvidence.fromParentReport?.forEach((s) =>
      evidence.push({ type: 'text', summary: s, confidence: 0.85 })
    );
    report.supportingEvidence.fromVisualAnalysis?.forEach((s) =>
      evidence.push({ type: 'image', summary: s, confidence: 0.75 })
    );
    report.supportingEvidence.fromAssessmentScores?.forEach((s) =>
      evidence.push({ type: 'score', summary: s, confidence: 0.9 })
    );
  }

  if (report.keyFindings?.length) {
    report.keyFindings.forEach((kf) =>
      evidence.push({ type: 'text', summary: kf, confidence: 0.8 })
    );
  }

  const domainLabel = report.developmentalProfile?.concerns?.length
    ? 'Areas of concern'
    : 'Developmental profile';
  domains[domainLabel] = report.riskLevel || 'Unknown';

  return {
    reportId: screeningId,
    status: 'draft',
    clinicalSummary: report.summary || 'No summary available.',
    parentSummary: report.parentFriendlyExplanation || report.summary || '',
    riskAssessment: {
      overall: report.riskRationale || report.summary || 'Assessment complete.',
      domains,
    },
    evidence,
    recommendations: report.recommendations || [],
    disclaimer: DISCLAIMER_DRAFT,
  };
}
