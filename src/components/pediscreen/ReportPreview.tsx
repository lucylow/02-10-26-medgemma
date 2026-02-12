import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Target, TrendingUp, Lightbulb, Shield, Brain } from 'lucide-react';
import ExplainabilityHeatmap from './ExplainabilityHeatmap';
import type { MedGemmaReport } from '@/api/medgemma';

interface ReportPreviewProps {
  report: MedGemmaReport;
  /** Optional: pass-through for ResultsScreen compatibility */
  compact?: boolean;
  className?: string;
}

/**
 * Report Preview — structured + narrative MedGemma output.
 * Clear separation: AI draft vs clinician decision.
 * Evidence-first for trust-building.
 */
const ReportPreview: React.FC<ReportPreviewProps> = ({ report, compact, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      <Card className="bg-white dark:bg-card rounded-xl shadow-lg border-none overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI-Generated Draft Report
            </CardTitle>
            <Badge variant={report.status === 'final' ? 'default' : 'secondary'}>
              {report.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            MedGemma multimodal synthesis — requires clinician review
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Clinical Summary */}
          <div>
            <h3 className="font-medium flex items-center gap-2 text-sm mb-2">
              <FileText className="w-4 h-4 text-primary" />
              Clinical Summary
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {report.clinicalSummary}
            </p>
          </div>

          {/* Parent Summary (when available) */}
          {report.parentSummary && (
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
              <h3 className="font-medium text-xs text-primary mb-1">Parent-facing summary</h3>
              <p className="text-sm text-foreground">{report.parentSummary}</p>
            </div>
          )}

          {/* Risk Assessment */}
          {report.riskAssessment && (
            <div>
              <h3 className="font-medium flex items-center gap-2 text-sm mb-2">
                <Target className="w-4 h-4 text-primary" />
                Risk Assessment
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {report.riskAssessment.overall}
              </p>
              {report.riskAssessment.domains && Object.keys(report.riskAssessment.domains).length > 0 && (
                <ul className="text-sm space-y-1">
                  {Object.entries(report.riskAssessment.domains).map(([k, v]) => (
                    <li key={k} className="flex gap-2">
                      <b className="text-foreground">{k}:</b>
                      <span className="text-muted-foreground">{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Longitudinal (when available) */}
          {report.longitudinal && (
            <div>
              <h3 className="font-medium flex items-center gap-2 text-sm mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Trajectory
              </h3>
              <p className="text-sm text-muted-foreground">
                {report.longitudinal.trajectory} — {report.longitudinal.interpretation}
              </p>
            </div>
          )}

          {/* Key Evidence */}
          {report.evidence && report.evidence.length > 0 && (
            <div>
              <h3 className="font-medium flex items-center gap-2 text-sm mb-2">
                <Target className="w-4 h-4 text-primary" />
                Key Evidence
              </h3>
              <ul className="text-sm list-disc ml-4 space-y-1 text-muted-foreground">
                {report.evidence.map((e, i) => (
                  <li key={i}>
                    {e.summary}
                    {e.confidence != null && (
                      <span className="text-xs ml-1">({Math.round(e.confidence * 100)}%)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <div>
              <h3 className="font-medium flex items-center gap-2 text-sm mb-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Recommendations
              </h3>
              <ol className="text-sm list-decimal ml-4 space-y-1 text-muted-foreground">
                {report.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Explainability Heatmap */}
          {!compact && (
            <div className="pt-4 border-t">
              <ExplainabilityHeatmap
                reportId={report.reportId}
                domains={report.riskAssessment?.domains}
                evidence={report.evidence}
              />
            </div>
          )}

          {/* Disclaimer */}
          {report.disclaimer && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs rounded-lg border border-amber-200 dark:border-amber-800">
              <Shield className="w-4 h-4 inline mr-2 align-middle" />
              {report.disclaimer}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReportPreview;
