import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Image, Scan, CheckCircle2, AlertTriangle, Fingerprint, Ruler, Palette } from 'lucide-react';
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
  'default': Scan,
};

const getCategoryIcon = (finding: string): React.ElementType => {
  const lowerFinding = finding.toLowerCase();
  if (lowerFinding.includes('grip') || lowerFinding.includes('motor') || lowerFinding.includes('stroke')) {
    return categoryIcons.motor;
  }
  if (lowerFinding.includes('spatial') || lowerFinding.includes('proportion') || lowerFinding.includes('size')) {
    return categoryIcons.spatial;
  }
  if (lowerFinding.includes('color') || lowerFinding.includes('colour')) {
    return categoryIcons.color;
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
          <CardTitle className="text-primary flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Eye className="w-4 h-4 text-accent" />
            </div>
            Visual Evidence Analysis
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
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Scan className="w-3.5 h-3.5" />
              <span>
                Visual features extracted via MedSigLIP medical vision encoder and fused with text observations
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VisualEvidenceCard;
