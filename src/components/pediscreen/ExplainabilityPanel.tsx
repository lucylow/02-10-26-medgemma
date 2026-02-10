import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  MessageSquareText, 
  ImageIcon, 
  FileText,
  Sparkles,
  Brain,
  Link2,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EvidenceItem {
  source: 'text' | 'image' | 'questionnaire';
  content: string;
  impact: 'high' | 'medium' | 'low';
  highlighted?: boolean;
}

interface ExplainabilityPanelProps {
  evidenceItems: EvidenceItem[];
  reasoningSteps?: string[];
  className?: string;
}

const sourceConfig = {
  text: { 
    icon: MessageSquareText, 
    label: 'Parent Observation', 
    color: 'text-blue-500',
    bg: 'bg-blue-50 border-blue-100' 
  },
  image: { 
    icon: ImageIcon, 
    label: 'Visual Analysis', 
    color: 'text-purple-500',
    bg: 'bg-purple-50 border-purple-100' 
  },
  questionnaire: { 
    icon: FileText, 
    label: 'Assessment Score', 
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 border-emerald-100' 
  },
};

const impactConfig = {
  high: { label: 'Key Factor', color: 'bg-primary text-primary-foreground' },
  medium: { label: 'Supporting', color: 'bg-secondary text-secondary-foreground' },
  low: { label: 'Minor', color: 'bg-muted text-muted-foreground' },
};

const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  evidenceItems,
  reasoningSteps,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const keyFactors = evidenceItems.filter(e => e.impact === 'high');
  const supportingFactors = evidenceItems.filter(e => e.impact !== 'high');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn('shadow-lg border-none overflow-hidden', className)}>
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-primary flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              See the Evidence
              <Badge variant="outline" className="ml-2 border-primary/30 text-primary text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                XAI
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? 'Hide' : 'Show'} Details
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Understanding <strong>why</strong> the AI reached this conclusion builds trust.
          </p>
        </CardHeader>
        
        <CardContent className="pt-4 space-y-4">
          {/* Key Factors Summary - Always visible */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Key Factors Influencing Assessment
            </h4>
            <div className="flex flex-wrap gap-2">
              {keyFactors.map((item, idx) => {
                const Source = sourceConfig[item.source];
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border',
                      Source.bg,
                      item.highlighted && 'ring-2 ring-primary ring-offset-1'
                    )}
                  >
                    <Source.icon className={cn('w-4 h-4', Source.color)} />
                    <span className="text-sm text-foreground">{item.content}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Supporting Factors */}
                {supportingFactors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Supporting Evidence
                    </h4>
                    <div className="space-y-2">
                      {supportingFactors.map((item, idx) => {
                        const Source = sourceConfig[item.source];
                        const Impact = impactConfig[item.impact];
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                          >
                            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', Source.bg)}>
                              <Source.icon className={cn('w-3.5 h-3.5', Source.color)} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-foreground">{item.content}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">{Source.label}</span>
                                <Badge className={cn('text-[10px] px-1.5 py-0', Impact.color)}>
                                  {Impact.label}
                                </Badge>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reasoning Chain */}
                {reasoningSteps && reasoningSteps.length > 0 && (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReasoning(!showReasoning)}
                      className="gap-2 text-muted-foreground hover:text-foreground p-0 h-auto"
                    >
                      <Brain className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        {showReasoning ? 'Hide' : 'View'} AI Reasoning Chain
                      </span>
                      {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                    
                    <AnimatePresence>
                      {showReasoning && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pl-4 border-l-2 border-primary/30 space-y-2"
                        >
                          {reasoningSteps.map((step, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-start gap-2"
                            >
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-primary">{idx + 1}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{step}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Connection Note */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                  <Link2 className="w-4 h-4" />
                  <span>
                    Evidence from multiple sources (text + images) strengthens assessment reliability through <strong>multimodal fusion</strong>.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ExplainabilityPanel;
