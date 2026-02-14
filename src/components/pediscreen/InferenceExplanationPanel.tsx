/**
 * InferenceExplanationPanel — Clinician-facing explainability UI.
 * Tabbed view: Summary | Evidence | Reasoning
 * Confidence gauge, collapsible reasoning steps, nearest neighbor thumbnails.
 * Per design spec: AI Explainability & Trust — Human-Centered Design.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  Brain,
  Gauge,
  ImageIcon,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface EvidenceItemData {
  type: string;
  description: string;
  reference_ids?: string[];
  influence?: number;
}

export interface InferenceExplanationData {
  summary: string[];
  risk: string;
  confidence: number;
  evidence: EvidenceItemData[];
  reasoning_chain: string[];
  model_provenance?: Record<string, string>;
  recommendations?: string[];
  parent_text?: string;
}

interface InferenceExplanationPanelProps {
  data: InferenceExplanationData;
  className?: string;
  /** Optional nearest neighbor thumbnails (de-identified case previews) */
  neighborThumbnails?: { id: string; label: string; similarity?: number }[];
}

const confidenceColor = (c: number) =>
  c >= 0.75 ? 'bg-emerald-500' : c >= 0.45 ? 'bg-amber-500' : 'bg-rose-500';

const confidenceLabel = (c: number) =>
  c >= 0.75 ? 'High trust' : c >= 0.45 ? 'Medium trust' : 'Low trust';

const InferenceExplanationPanel: React.FC<InferenceExplanationPanelProps> = ({
  data,
  className,
  neighborThumbnails = [],
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState('summary');

  const toggleStep = (idx: number) => {
    setExpandedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const percent = Math.round((data.confidence ?? 0.5) * 100);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={className}
      >
        <Card
          className="shadow-lg border-none overflow-hidden"
          role="region"
          aria-label="AI inference explanation"
        >
          <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="text-primary flex items-center gap-2 text-lg">
                <div
                  className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
                  aria-hidden
                >
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                Clinician Explanation Panel
                <Badge variant="outline" className="ml-2 border-primary/30 text-primary text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  XAI
                </Badge>
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Transparent reasoning, evidence, and confidence for clinical review.
            </p>
          </CardHeader>

          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary" className="gap-1.5">
                  <FileText className="w-4 h-4" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="evidence" className="gap-1.5">
                  <Link2 className="w-4 h-4" />
                  Evidence
                </TabsTrigger>
                <TabsTrigger value="reasoning" className="gap-1.5">
                  <Brain className="w-4 h-4" />
                  Reasoning
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Risk Level
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize',
                      data.risk === 'low' && 'border-emerald-300 text-emerald-700',
                      data.risk === 'monitor' && 'border-amber-300 text-amber-700',
                      (data.risk === 'high' || data.risk === 'refer') &&
                        'border-red-300 text-red-700'
                    )}
                  >
                    {data.risk}
                  </Badge>
                </div>

                <div aria-label={`Confidence: ${percent}% - ${confidenceLabel(data.confidence)}`}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Gauge className="w-3.5 h-3.5" />
                    Confidence
                  </h4>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="space-y-1 cursor-help">
                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              confidenceColor(data.confidence)
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {percent}% — {confidenceLabel(data.confidence)}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Confidence {percent}%: {confidenceLabel(data.confidence)}
                      </p>
                      <p className="text-xs mt-1">
                        Model certainty in this risk stratification. Review evidence when
                        confidence is medium or low.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {(data.summary?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Summary
                    </h4>
                    <ul className="space-y-1">
                      {data.summary.map((s, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.model_provenance && Object.keys(data.model_provenance).length > 0 && (
                  <div className="pt-2 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Model Provenance
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {data.model_provenance.model_id && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {data.model_provenance.model_id}
                        </Badge>
                      )}
                      {data.model_provenance.adapter_id && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          adapter: {String(data.model_provenance.adapter_id).slice(0, 12)}…
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="evidence" className="mt-4 space-y-4">
                {neighborThumbnails.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Similar Cases (Nearest Neighbors)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {neighborThumbnails.map((n) => (
                        <Tooltip key={n.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="w-16 h-16 rounded-lg border-2 border-dashed bg-muted/50 flex items-center justify-center text-xs font-medium cursor-help hover:border-primary/50 transition-colors"
                              role="img"
                              aria-label={`Similar case ${n.id}: ${n.label}`}
                            >
                              {n.label.slice(0, 2)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Case: {n.id}</p>
                            <p>{n.label}</p>
                            {n.similarity != null && (
                              <p className="text-xs">Similarity: {(n.similarity * 100).toFixed(0)}%</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Evidence Items
                  </h4>
                  {(data.evidence?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No evidence items available.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.evidence.map((e, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-muted/30 border text-sm"
                          role="article"
                          aria-label={`Evidence ${i + 1}: ${e.type} - ${e.description.slice(0, 50)}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {e.type}
                            </Badge>
                            {e.influence != null && (
                              <span className="text-xs text-muted-foreground">
                                influence: {(e.influence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-foreground">{e.description}</p>
                          {e.reference_ids && e.reference_ids.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Refs: {e.reference_ids.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reasoning" className="mt-4 space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  AI Reasoning Chain (Step by Step)
                </h4>
                {(data.reasoning_chain?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No reasoning steps available.
                  </p>
                ) : (
                  <div className="space-y-2 border-l-2 border-primary/30 pl-4">
                    {data.reasoning_chain.map((step, idx) => (
                      <Collapsible
                        key={idx}
                        open={expandedSteps[idx] ?? true}
                        onOpenChange={() => toggleStep(idx)}
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            className="flex items-start gap-2 w-full text-left hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-expanded={expandedSteps[idx] ?? true}
                            aria-controls={`reasoning-step-${idx}`}
                            id={`reasoning-trigger-${idx}`}
                          >
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-primary">{idx + 1}</span>
                            </div>
                            <span className="text-sm text-foreground flex-1 line-clamp-2">
                              {step}
                            </span>
                            {expandedSteps[idx] === false ? (
                              <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronUp className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent id={`reasoning-step-${idx}`}>
                          <AnimatePresence>
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-sm text-muted-foreground pl-7 pb-2"
                            >
                              {step}
                            </motion.p>
                          </AnimatePresence>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};

export default InferenceExplanationPanel;
