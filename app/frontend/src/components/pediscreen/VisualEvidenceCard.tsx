import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Image, Scan, CheckCircle2, AlertTriangle, Fingerprint, Ruler, Palette, Users, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

type VisualFinding = {
  category: string;
  observation: string;
  confidence?: 'high' | 'medium' | 'low';
};

type VisualEvidenceCardProps = {
  findings: string[];
  imagePreview?: string | null;
  domain?: string;
  className?: string;
};

const categoryIcons: Record<string, React.ElementType> = {
  'motor': Fingerprint,
  'spatial': Ruler,
  'visual': Eye,
  'color': Palette,
  'social': Users,
  'cognitive': Brain,
  'default': Scan,
};

const domainLabels: Record<string, string> = {
  communication: 'Communication & Language',
  gross_motor: 'Gross Motor',
  fine_motor: 'Fine Motor',
  cognitive: 'Problem Solving',
  social: 'Personal-Social',
};

const getCategoryIcon = (finding: string): React.ElementType => {
  const lowerFinding = finding.toLowerCase();
  if (lowerFinding.includes('grip') || lowerFinding.includes('motor') || lowerFinding.includes('stroke') || lowerFinding.includes('block') || lowerFinding.includes('scribble')) {
    return categoryIcons.motor;
  }
  if (lowerFinding.includes('spatial') || lowerFinding.includes('proportion') || lowerFinding.includes('size') || lowerFinding.includes('form')) {
    return categoryIcons.spatial;
  }
  if (lowerFinding.includes('color') || lowerFinding.includes('colour')) {
    return categoryIcons.color;
  }
  if (lowerFinding.includes('play') || lowerFinding.includes('pretend') || lowerFinding.includes('social') || lowerFinding.includes('peer')) {
    return categoryIcons.social;
  }
  if (lowerFinding.includes('puzzle') || lowerFinding.includes('count') || lowerFinding.includes('rule') || lowerFinding.includes('sequence')) {
    return categoryIcons.cognitive;
  }
  return categoryIcons.default;
};

const VisualEvidenceCard: React.FC<VisualEvidenceCardProps> = ({
  findings,
  imagePreview,
  domain,
  className,
}) => {
  if (!findings || findings.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn('shadow-lg border-none overflow-hidden', className)}>
        <CardHeader className="pb-3 bg-gradient-to-r from-accent/10 to-transparent">
          <CardTitle className="text-primary flex items-center gap-2 text-lg flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Eye className="w-4 h-4 text-accent" />
            </div>
            Visual Evidence Analysis
            {domain && (
              <Badge variant="secondary" className="text-xs font-medium">
                {domainLabels[domain] || domain}
              </Badge>
            )}
            <Badge variant="outline" className="ml-auto border-accent/30 text-accent text-xs">
              MedSigLIP
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Image preview if available */}
            {imagePreview && (
              <div className="flex-shrink-0">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Analyzed visual evidence"
                    className="w-32 h-32 object-cover rounded-xl border-2 border-accent/20"
                  />
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-success rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* Findings list */}
            <div className="flex-1 space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Detected Features & Observations
              </div>
              <ul className="space-y-2">
                {findings.map((finding, idx) => {
                  const Icon = getCategoryIcon(finding);
                  return (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3 p-2.5 bg-accent/5 rounded-lg border border-accent/10"
                    >
                      <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <span className="text-sm text-foreground leading-relaxed">{finding}</span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Technical note */}
          <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Scan className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Visual features from MedSigLIP medical vision encoder, fused with text for screening support. Not a substitute for clinical assessment.
              </span>
            </div>
            {domain && (
              <p className="text-[10px] text-muted-foreground italic pl-6">
                Domain: {domainLabels[domain] || domain} — observations are interpreted in this developmental area only.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VisualEvidenceCard;
