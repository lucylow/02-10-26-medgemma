import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ChevronRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type HelpContext = 'screening' | 'results' | 'general';

export interface HelpTip {
  id: string;
  text: string;
  icon: string;
}

export const HELP_CONTENT: Record<HelpContext, HelpTip[]> = {
  screening: [
    {
      id: 'detail',
      text: "Specific examples help our AI better understand. Instead of \"talks late,\" try \"uses about 10 single words at 24 months.\"",
      icon: 'message-text',
    },
    {
      id: 'images',
      text: 'Photos of drawings or play can show fine motor skills and creativity that words might miss.',
      icon: 'image',
    },
    {
      id: 'age',
      text: 'Exact age in months helps us compare to precise developmental milestones.',
      icon: 'cake-variant',
    },
  ],
  results: [
    {
      id: 'timing',
      text: "Development isn't a race. Children reach milestones at different paces.",
      icon: 'chart-timeline',
    },
    {
      id: 'actions',
      text: 'Focus on one recommendation at a time. Small steps make big differences.',
      icon: 'check-circle',
    },
    {
      id: 'discussion',
      text: 'Share these results with your pediatrician to start a conversation.',
      icon: 'account-group',
    },
  ],
  general: [
    {
      id: 'general',
      text: 'Take your time. This is not a test.',
      icon: 'clock-outline',
    },
  ],
};

interface ProgressiveHelpProps {
  context: HelpContext;
  className?: string;
}

const ProgressiveHelp: React.FC<ProgressiveHelpProps> = ({ context, className }) => {
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  const tips = HELP_CONTENT[context] || HELP_CONTENT.general;

  const nextTip = () => {
    setActiveTipIndex((prev) => (prev + 1) % tips.length);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isHelpVisible && tips.length > 1) {
      interval = setInterval(nextTip, 5000);
    }
    return () => clearInterval(interval);
  }, [isHelpVisible, activeTipIndex, tips.length]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsHelpVisible(!isHelpVisible)}
        className={cn(
          'h-10 w-10 rounded-full transition-colors',
          isHelpVisible ? 'bg-primary/20 text-primary' : 'text-primary hover:bg-primary/10',
          className
        )}
        aria-label={isHelpVisible ? 'Close help' : 'Show helpful tips'}
      >
        {isHelpVisible ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </Button>

      <AnimatePresence>
        {isHelpVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:max-w-sm"
          >
            <div className="rounded-2xl border-2 border-primary/20 bg-card shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Helpful Tip</span>
                </div>
                {tips.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextTip}
                    className="h-8 w-8 rounded-full"
                    aria-label="Next tip"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-start gap-3 p-4">
                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                  {tips[activeTipIndex].text}
                </p>
              </div>
              {tips.length > 1 && (
                <div className="flex justify-center gap-1.5 pb-4">
                  {tips.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveTipIndex(index)}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        index === activeTipIndex
                          ? 'w-6 bg-primary'
                          : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      )}
                      aria-label={`Go to tip ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProgressiveHelp;
