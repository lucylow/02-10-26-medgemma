import React from 'react';
import { motion } from 'framer-motion';
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

/**
 * Explainability heatmap — visualizes evidence influence per domain.
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

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'bg-emerald-500';
    if (conf >= 0.6) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <Card className={cn('shadow-lg border-none overflow-hidden', className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
        <CardTitle className="text-primary flex items-center gap-2 text-base">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          Explainability Heatmap
          <span className="text-xs font-normal text-muted-foreground">
            (Report {reportId.slice(0, 12)}…)
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Evidence influence by domain — XAI transparency for clinical review
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {domainEntries.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Domain-Level Evidence
            </h4>
            <div className="space-y-2">
              {domainEntries.map((d, idx) => {
                const conf = 'confidence' in d ? d.confidence : 0.8;
                return (
                  <motion.div
                    key={d.domain}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-sm text-foreground w-36 truncate">
                      {typeof d.label === 'string' ? d.label : d.domain}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', getConfidenceColor(conf))}
                        initial={{ width: 0 }}
                        animate={{ width: `${conf * 100}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {Math.round(conf * 100)}%
                    </span>
                  </motion.div>
                );
              })}
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
                    'px-3 py-1.5 rounded-lg text-xs border',
                    e.type === 'text' && 'bg-blue-50 border-blue-100 text-blue-800',
                    e.type === 'image' && 'bg-purple-50 border-purple-100 text-purple-800',
                    e.type === 'score' && 'bg-emerald-50 border-emerald-100 text-emerald-800',
                    !['text', 'image', 'score'].includes(e.type) && 'bg-muted/50 border-muted'
                  )}
                >
                  <span className="line-clamp-2">{e.summary}</span>
                  {e.confidence != null && (
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {Math.round(e.confidence * 100)}%
                    </span>
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
