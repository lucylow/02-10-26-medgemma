import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Scan, Brain, Fingerprint, Ruler, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type AnalysisFeature = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  active: boolean;
};

type MultimodalAnalysisPreviewProps = {
  imagePreview: string | null;
  isAnalyzing?: boolean;
  analysisComplete?: boolean;
  className?: string;
};

const analysisFeatures: Omit<AnalysisFeature, 'active'>[] = [
  {
    id: 'visual_encoding',
    label: 'Visual Encoding',
    icon: Eye,
    description: 'MedSigLIP vision encoder processing',
  },
  {
    id: 'pattern_detection',
    label: 'Pattern Detection',
    icon: Scan,
    description: 'Detecting developmental markers',
  },
  {
    id: 'motor_skills',
    label: 'Motor Skills Analysis',
    icon: Fingerprint,
    description: 'Evaluating grip and stroke patterns',
  },
  {
    id: 'spatial',
    label: 'Spatial Assessment',
    icon: Ruler,
    description: 'Analyzing form and proportions',
  },
  {
    id: 'fusion',
    label: 'Multimodal Fusion',
    icon: Brain,
    description: 'Combining visual + text context',
  },
];

const MultimodalAnalysisPreview: React.FC<MultimodalAnalysisPreviewProps> = ({
  imagePreview,
  isAnalyzing = false,
  analysisComplete = false,
  className,
}) => {
  if (!imagePreview) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('relative', className)}
    >
      {/* Image with overlay effects */}
      <div className="relative group">
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 shadow-lg">
          <img
            src={imagePreview}
            alt="Visual evidence for analysis"
            className={cn(
              'max-w-full max-h-64 object-contain transition-all duration-500',
              isAnalyzing && 'blur-[1px]'
            )}
          />
          
          {/* Scanning overlay animation */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              >
                {/* Scanning line effect */}
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
                  initial={{ top: 0 }}
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
                
                {/* Corner brackets */}
                <div className="absolute inset-2">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/60" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/60" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/60" />
                </div>
                
                {/* Semi-transparent overlay */}
                <div className="absolute inset-0 bg-primary/5" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success overlay */}
          <AnimatePresence>
            {analysisComplete && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-3 right-3"
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success text-success-foreground rounded-full text-xs font-medium shadow-lg">
                  <Check className="w-3.5 h-3.5" />
                  Analyzed
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MedGemma badge */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <motion.div 
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full text-xs font-medium shadow-md"
            animate={isAnalyzing ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 1, repeat: isAnalyzing ? Infinity : 0 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            MedGemma Multimodal
          </motion.div>
        </div>
      </div>

      {/* Analysis features indicators */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {analysisFeatures.map((feature, index) => {
          const Icon = feature.icon;
          const isActive = isAnalyzing || analysisComplete;
          
          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center',
                isActive
                  ? 'bg-primary/5 border-primary/20 text-primary'
                  : 'bg-muted/50 border-transparent text-muted-foreground'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                isActive ? 'bg-primary/10' : 'bg-muted'
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium leading-tight">{feature.label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Technical info tooltip */}
      <div className="mt-4 p-3 bg-muted/50 rounded-xl border border-border/50">
        <div className="flex items-start gap-2">
          <Brain className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Multimodal Fusion:</strong> MedSigLIP encodes visual features 
            at up to 420×420 resolution, then fuses with text observations for joint clinical reasoning.
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MultimodalAnalysisPreview;
