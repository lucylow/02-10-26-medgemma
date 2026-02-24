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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BarChart3, Eye, Sparkles } from 'lucide-react';

export interface DomainConfidence {
  domain: string;
  confidence: number;
  label: string;
}

interface ExplainabilityHeatmapProps {
  reportId: string;
  /** Domain-level confidence from riskAssessment.domains or evidence */
  domains?: Record<string, string> | DomainConfidence[];
  /** Evidence items with optional confidence */
  evidence?: Array<{ type: string; summary: string; confidence?: number }>;
  className?: string;
}

const getConfidenceColor = (conf: number) => {
  if (conf >= 0.8) return 'hsl(142, 76%, 36%)';
  if (conf >= 0.6) return 'hsl(38, 92%, 50%)';
  return 'hsl(0, 84%, 60%)';
};

/**
 * Explainability heatmap — visualizes evidence influence per domain with Recharts.
 * Helps clinicians understand "why" the model reached its conclusion.
 */
const ExplainabilityHeatmap: React.FC<ExplainabilityHeatmapProps> = ({
  reportId,
  domains = {},
  evidence = [],
  className,
}) => {
  const domainEntries = Array.isArray(domains)
    ? domains
    : Object.entries(domains).map(([domain, label]) => ({
        domain,
        label: typeof label === 'string' ? label : JSON.stringify(label),
        confidence: 0.8,
      }));

  const chartData = useMemo(
    () =>
      domainEntries.map((d) => ({
        name: typeof d.label === 'string' ? d.label : d.domain,
        domain: d.domain,
        confidence: 'confidence' in d ? d.confidence : 0.8,
        pct: Math.round(('confidence' in d ? d.confidence : 0.8) * 100),
      })),
    [domainEntries]
  );

  return (
    <Card className={cn('shadow-lg border-none overflow-hidden', className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
        <CardTitle className="text-primary flex items-center gap-2 text-base">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          Explainability Heatmap
          <span className="text-xs font-normal text-muted-foreground">
            (Report {String(reportId).slice(0, 12)}…)
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Evidence influence by domain — XAI transparency for clinical review
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {chartData.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Domain-Level Evidence
            </h4>
            <div className="bg-muted/20 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 40)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 32, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${Math.round((value as number) * 100)}%`, 'Confidence']}
                    labelFormatter={(label) => `Domain: ${label}`}
                  />
                  <Bar dataKey="confidence" radius={[0, 4, 4, 0]} maxBarSize={24} name="Confidence">
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={getConfidenceColor(entry.confidence)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {evidence.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Evidence Items
            </h4>
            <div className="flex flex-wrap gap-2">
              {evidence.slice(0, 6).map((e, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs border flex flex-col gap-1',
                    e.type === 'text' && 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
                    e.type === 'image' && 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
                    e.type === 'score' && 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
                    !['text', 'image', 'score'].includes(e.type) && 'bg-muted/50 border-muted'
                  )}
                >
                  <span className="line-clamp-2">{e.summary}</span>
                  {e.confidence != null && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden min-w-[60px]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${e.confidence * 100}%` }}
                          transition={{ duration: 0.5 }}
                          className={cn('h-full rounded-full')}
                          style={{ backgroundColor: getConfidenceColor(e.confidence) }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {Math.round(e.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {domainEntries.length === 0 && evidence.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No domain-level evidence available for this report.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ExplainabilityHeatmap;
