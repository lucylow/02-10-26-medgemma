import React from 'react';
import { Brain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UpgradeBannerProps {
  onUpgrade: () => void;
  className?: string;
}

export function UpgradeBanner({ onUpgrade, className }: UpgradeBannerProps) {
  return (
    <Card
      className={cn(
        'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-800 cursor-pointer transition-all hover:shadow-md active:scale-[0.98]',
        className
      )}
      onClick={onUpgrade}
    >
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              AI Enhancement Available
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Upgrade to live MedGemma analysis (2x more accurate)
            </p>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onUpgrade();
            }}
          >
            Upgrade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
