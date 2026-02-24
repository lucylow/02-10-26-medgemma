/**
 * MedGemma Research & Analytics — domain breakdown, evidence influence, and key metrics.
 * Provides a clear, graph-driven view of AI outputs for clinicians and research UX.
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Brain,
  Sparkles,
  TrendingUp,
  Target,
  Activity,
} from 'lucide-react';
import type { DomainAnalysis } from '@/types/medgemma';

const DOMAIN_LABELS: Record<string, string> = {
  communication: 'Communication',
  gross_motor: 'Gross Motor',
  fine_motor: 'Fine Motor',
  cognitive: 'Cognitive',
  social: 'Personal-Social',
};

const RISK_COLORS: Record<string, string> = {
  low: 'hsl(142, 76%, 36%)',      // emerald
  medium: 'hsl(38, 92%, 50%)',    // amber
  high: 'hsl(0, 84%, 60%)',      // red
};

function riskToNumeric(risk: string): number {
  switch (risk?.toLowerCase()) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
    default: return 0;
  }
}

export interface MedGemmaAnalyticsPanelProps {
  /** Domain-level analysis from report.domainBreakdown */
  domainBreakdown?: Record<string, DomainAnalysis>;
  /** Overall confidence 0–1 */
  confidence?: number;
  /** Evidence items with optional influence for bar chart */
  evidence?: Array<{ type: string; summary: string; influence?: number; confidence?: number }>;
  /** Key findings to show as tags */
  keyFindings?: string[];
  /** Report/screening id for header */
  reportId?: string;
  /** Compact mode for embedding in smaller spaces */
  compact?: boolean;
  className?: string;
}

export function MedGemmaAnalyticsPanel({
  domainBreakdown = {},
  confidence,
  evidence = [],
  keyFindings = [],
  reportId,
  compact = false,
  className,
}: MedGemmaAnalyticsPanelProps) {
  const domainChartData = useMemo(() => {
    const entries = Object.entries(domainBreakdown);
    if (entries.length === 0) return [];
    return entries.map(([key, val]) => ({
      name: DOMAIN_LABELS[key] || key.replace(/_/g, ' '),
      domain: key,
      risk: val.risk,
      riskN: riskToNumeric(val.risk),
      summary: val.summary?.slice(0, 60),
    }));
  }, [domainBreakdown]);

  const evidenceChartData = useMemo(() => {
    if (!evidence.length) return [];
    return evidence.slice(0, 8).map((e, i) => ({
      name: e.type === 'text' ? 'Parent report' : e.type === 'image' ? 'Visual' : e.type === 'score' ? 'Assessment' : e.type,
      influence: e.influence ?? e.confidence ?? 0.8,
      index: i,
    }));
  }, [evidence]);

  const hasDomainChart = domainChartData.length > 0;
  const hasEvidenceChart = evidenceChartData.length > 0 && evidenceChartData.some(d => d.influence > 0);
  const hasContent = hasDomainChart || hasEvidenceChart || keyFindings.length > 0 || confidence != null;

  if (!hasContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={className}
    >
      <Card className="shadow-lg border-none overflow-hidden bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-b border-border/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-primary flex items-center gap-2 text-lg">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              MedGemma Research & Analytics
              <Badge variant="outline" className="ml-2 border-primary/30 text-primary text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                XAI
              </Badge>
            </CardTitle>
            {reportId && (
              <span className="text-xs font-mono text-muted-foreground">
                {String(reportId).slice(0, 12)}…
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Domain-level risk and evidence influence — transparent AI outputs for clinical review
          </p>
        </CardHeader>
        <CardContent className={cn('pt-4 space-y-6', compact && 'space-y-4')}>
          {/* Confidence gauge when no domain breakdown */}
          {confidence != null && !compact && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
              <Brain className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Model confidence
                </p>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(confidence * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full',
                      confidence >= 0.85 && 'bg-emerald-500',
                      confidence >= 0.65 && confidence < 0.85 && 'bg-amber-500',
                      confidence < 0.65 && 'bg-rose-500'
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(confidence * 100)}% — {confidence >= 0.85 ? 'High' : confidence >= 0.65 ? 'Moderate' : 'Lower'} confidence
                </p>
              </div>
            </div>
          )}

          {/* Domain risk bar chart */}
          {hasDomainChart && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Domain risk overview
              </h4>
              <div className={cn('bg-muted/20 rounded-xl p-4', compact && 'p-3')}>
                <ResponsiveContainer width="100%" height={compact ? 200 : 260}>
                  <BarChart
                    data={domainChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" domain={[0, 4]} tickFormatter={() => ''} hide />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as (typeof domainChartData)[0];
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-md">
                            <p className="font-medium text-foreground">{row.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 capitalize">Risk: {row.risk}</p>
                            {row.summary && <p className="text-xs text-muted-foreground mt-1">{row.summary}…</p>}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="riskN" name="Risk level" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {domainChartData.map((entry, index) => (
                        <Cell key={index} fill={RISK_COLORS[entry.risk] ?? 'hsl(var(--muted-foreground))'} />
                      ))}
                    </Bar>
                    <Legend
                      formatter={() => (
                        <span className="text-xs text-muted-foreground">
                          Low / Medium / High
                        </span>
                      )}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Evidence influence horizontal bar */}
          {hasEvidenceChart && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Evidence influence
              </h4>
              <div className="bg-muted/20 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={Math.min(180, evidenceChartData.length * 36)}>
                  <BarChart
                    data={evidenceChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                      }}
                      formatter={(value: number) => [`${Math.round(value * 100)}%`, 'Influence']}
                    />
                    <Bar dataKey="influence" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={20} name="Influence" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Key findings tags */}
          {keyFindings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Key findings
              </h4>
              <div className="flex flex-wrap gap-2">
                {keyFindings.slice(0, 6).map((finding, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm text-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {finding.length > 80 ? `${finding.slice(0, 80)}…` : finding}
                  </motion.span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default MedGemmaAnalyticsPanel;
