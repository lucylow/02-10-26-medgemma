import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Info, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'uncertain';

interface ConfidenceIndicatorProps {
  confidence: number; // 0-1
  showLabel?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getConfidenceLevel = (confidence: number): ConfidenceLevel => {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.65) return 'medium';
  if (confidence >= 0.45) return 'low';
  return 'uncertain';
};

const getConfidenceConfig = (level: ConfidenceLevel) => {
  switch (level) {
    case 'high':
      return {
        label: 'High Confidence',
        description: 'The AI has strong evidence supporting this assessment.',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500',
        barColor: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
        icon: CheckCircle2,
      };
    case 'medium':
      return {
        label: 'Moderate Confidence',
        description: 'The assessment is reasonably supported, but additional information may help.',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500',
        barColor: 'bg-gradient-to-r from-amber-400 to-amber-600',
        icon: Info,
      };
    case 'low':
      return {
        label: 'Lower Confidence',
        description: 'Limited evidence available. Consider providing more observations or images.',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500',
        barColor: 'bg-gradient-to-r from-orange-400 to-orange-600',
        icon: AlertCircle,
      };
    case 'uncertain':
      return {
        label: 'Uncertain',
        description: 'Insufficient data for reliable assessment. More information is needed.',
        color: 'text-red-500',
        bgColor: 'bg-red-500',
        barColor: 'bg-gradient-to-r from-red-400 to-red-600',
        icon: HelpCircle,
      };
  }
};

const sizeConfig = {
  sm: { bar: 'h-1.5', text: 'text-xs', icon: 'w-3 h-3', width: 'w-24' },
  md: { bar: 'h-2', text: 'text-sm', icon: 'w-4 h-4', width: 'w-32' },
  lg: { bar: 'h-3', text: 'text-base', icon: 'w-5 h-5', width: 'w-40' },
};

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  showLabel = true,
  showTooltip = true,
  size = 'md',
  className,
}) => {
  const level = getConfidenceLevel(confidence);
  const config = getConfidenceConfig(level);
  const sizes = sizeConfig[size];
  const Icon = config.icon;
  const percentage = Math.round(confidence * 100);

  const indicator = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('flex items-center gap-2', className)}
    >
      <Icon className={cn(sizes.icon, config.color)} />
      <div className="flex-1">
        {showLabel && (
          <div className={cn('flex items-center justify-between mb-1', sizes.text)}>
            <span className="font-medium text-foreground">{config.label}</span>
            <span className={cn('font-bold', config.color)}>{percentage}%</span>
          </div>
        )}
        <div className={cn('bg-muted rounded-full overflow-hidden', sizes.bar, sizes.width)}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn('h-full rounded-full', config.barColor)}
          />
        </div>
      </div>
    </motion.div>
  );

  if (!showTooltip) return indicator;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{indicator}</div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConfidenceIndicator;
