import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Milestone {
  name: string;
  expectedAge: number; // in months
  status: 'achieved' | 'emerging' | 'not_observed';
  domain?: string;
}

interface VisualMilestoneTimelineProps {
  milestones: Milestone[];
  childAge: number;
  className?: string;
}

const domainEmojis: Record<string, string> = {
  communication: '💬',
  gross_motor: '🏃',
  fine_motor: '✋',
  cognitive: '🧩',
  social: '👋',
  default: '⭐',
};

const statusConfig = {
  achieved: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-200',
    label: 'Achieved',
  },
  emerging: {
    icon: TrendingUp,
    color: 'text-amber-500',
    bg: 'bg-amber-500',
    ring: 'ring-amber-200',
    label: 'Emerging',
  },
  not_observed: {
    icon: Circle,
    color: 'text-gray-400',
    bg: 'bg-gray-300',
    ring: 'ring-gray-200',
    label: 'Not Yet',
  },
};

const VisualMilestoneTimeline: React.FC<VisualMilestoneTimelineProps> = ({
  milestones,
  childAge,
  className,
}) => {
  const sortedMilestones = [...milestones].sort((a, b) => a.expectedAge - b.expectedAge);
  const achievedCount = milestones.filter(m => m.status === 'achieved').length;
  const emergingCount = milestones.filter(m => m.status === 'emerging').length;
  const progressPercentage = Math.round((achievedCount + emergingCount * 0.5) / milestones.length * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn('shadow-lg border-none overflow-hidden', className)}>
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-primary flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              Milestone Journey
            </CardTitle>
            <Badge 
              variant="secondary" 
              className={cn(
                'text-sm font-bold',
                progressPercentage >= 80 && 'bg-emerald-100 text-emerald-700',
                progressPercentage >= 50 && progressPercentage < 80 && 'bg-amber-100 text-amber-700',
                progressPercentage < 50 && 'bg-rose-100 text-rose-700'
              )}
            >
              {progressPercentage}% on track
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Visual progress at <strong>{childAge} months</strong> — each step shows developmental achievements
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{achievedCount} achieved</span>
              <span>{emergingCount} emerging</span>
              <span>{milestones.length - achievedCount - emergingCount} upcoming</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(achievedCount / milestones.length) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(emergingCount / milestones.length) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full"
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-accent/30 to-muted" />

            {/* Milestones */}
            <TooltipProvider>
              <div className="space-y-4">
                {sortedMilestones.map((milestone, idx) => {
                  const config = statusConfig[milestone.status];
                  const Icon = config.icon;
                  const emoji = domainEmojis[milestone.domain || 'default'];
                  const isOnTime = milestone.expectedAge <= childAge && milestone.status === 'achieved';
                  const isDelayed = milestone.expectedAge < childAge && milestone.status === 'not_observed';

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative flex items-start gap-4 pl-1"
                    >
                      {/* Status Icon */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center z-10 bg-background ring-4 transition-transform hover:scale-110 cursor-pointer',
                              config.ring,
                              isDelayed && 'ring-red-200'
                            )}
                          >
                            <Icon className={cn('w-5 h-5', config.color, isDelayed && 'text-red-400')} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">{config.label}</p>
                          {isDelayed && (
                            <p className="text-xs text-muted-foreground">Expected by {milestone.expectedAge}mo</p>
                          )}
                        </TooltipContent>
                      </Tooltip>

                      {/* Content */}
                      <div className={cn(
                        'flex-1 p-3 rounded-xl border transition-colors',
                        milestone.status === 'achieved' && 'bg-emerald-50/50 border-emerald-100',
                        milestone.status === 'emerging' && 'bg-amber-50/50 border-amber-100',
                        milestone.status === 'not_observed' && 'bg-muted/50 border-border',
                        isDelayed && 'bg-red-50/50 border-red-100'
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{emoji}</span>
                            <span className={cn(
                              'font-medium text-sm',
                              milestone.status === 'not_observed' && !isDelayed && 'text-muted-foreground'
                            )}>
                              {milestone.name}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-xs',
                              isOnTime && 'border-emerald-300 text-emerald-600',
                              isDelayed && 'border-red-300 text-red-600'
                            )}
                          >
                            {milestone.expectedAge}mo
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t text-xs text-muted-foreground">
            {Object.entries(statusConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn('w-3 h-3 rounded-full', config.bg)} />
                <span>{config.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VisualMilestoneTimeline;
