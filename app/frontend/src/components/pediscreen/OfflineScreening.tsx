import React, { useEffect } from 'react';
import { WifiOff, Brain, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOfflineAgents, type OfflineResponse } from '@/hooks/useOfflineAgents';
import { OfflineRuleDetails } from './OfflineRuleDetails';
import { UpgradeBanner } from './UpgradeBanner';
import { cn } from '@/lib/utils';

interface OfflineScreeningProps {
  input: string;
  age: number;
  domain: string;
  onUpgradeToOnline?: () => void;
}

const RISK_COLORS: Record<
  OfflineResponse['risk'],
  { bg: string; text: string; shadow: string }
> = {
  low: { bg: 'bg-emerald-200 dark:bg-emerald-900/50', text: 'text-emerald-800 dark:text-emerald-200', shadow: 'shadow-emerald-200' },
  monitor: { bg: 'bg-amber-200 dark:bg-amber-900/50', text: 'text-amber-800 dark:text-amber-200', shadow: 'shadow-amber-200' },
  elevated: { bg: 'bg-orange-200 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-200', shadow: 'shadow-orange-200' },
  discuss: { bg: 'bg-red-200 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200', shadow: 'shadow-red-200' },
};

function RiskBadge({
  level,
  confidence,
  mode,
}: {
  level: OfflineResponse['risk'];
  confidence: number;
  mode: OfflineResponse['mode'];
}) {
  const colors = RISK_COLORS[level];

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-lg shadow-md',
        colors.bg,
        colors.text
      )}
    >
      <span className="font-bold uppercase text-sm">{level}</span>
      <span className="text-sm opacity-90">
        {Math.round(confidence * 100)}% Confidence
      </span>
      {mode !== 'hybrid_enhanced' && (
        <Badge
          variant="secondary"
          className="ml-auto bg-black/10 dark:bg-white/10 text-inherit"
        >
          {mode.split('_')[0]}
        </Badge>
      )}
    </div>
  );
}

function NextStepsList({ steps }: { steps: string[] }) {
  if (!steps?.length) return null;

  return (
    <Card>
      <CardContent className="pt-4">
        <h4 className="font-semibold mb-2">Next Steps</h4>
        <ul className="space-y-1.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary font-medium">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function OfflineScreening({
  input,
  age,
  domain,
  onUpgradeToOnline,
}: OfflineScreeningProps) {
  const {
    mode,
    response,
    generateOfflineResponse,
    upgradeToOnline,
    isOptimistic,
    isOnline,
  } = useOfflineAgents(input, age, domain);

  useEffect(() => {
    generateOfflineResponse();
  }, [generateOfflineResponse]);

  const handleUpgrade = () => {
    onUpgradeToOnline?.();
    // If parent provides upgrade handler, it will switch to streaming.
    // Otherwise we could call upgradeToOnline with fetched data - but that
    // requires actually running the stream. The parent typically handles this
    // by navigating to streaming mode.
    upgradeToOnline({});
  };

  const modeConfig = {
    offline: {
      color: 'text-amber-600 dark:text-amber-400',
      icon: WifiOff,
      label: 'Offline Mode',
    },
    hybrid: {
      color: 'text-emerald-600 dark:text-emerald-400',
      icon: Brain,
      label: 'Hybrid (Cached + AI)',
    },
    online: {
      color: 'text-blue-600 dark:text-blue-400',
      icon: ShieldCheck,
      label: 'Live AI Agents',
    },
  };

  const currentMode = modeConfig[mode];
  const ModeIcon = currentMode.icon;

  const showUpgradeBanner =
    response &&
    (response.mode === 'offline_rules' || response.mode === 'offline_cached' || response.mode === 'offline_safe') &&
    isOnline;

  return (
    <div className="space-y-6 flex-1">
      {/* Mode indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        <ModeIcon className={cn('w-4 h-4', currentMode.color)} />
        <span className={cn('text-sm font-semibold', currentMode.color)}>
          {currentMode.label}
        </span>
        <Badge variant="outline" className={cn('text-xs', currentMode.color)}>
          {isOptimistic ? 'Optimistic' : 'Live'}
        </Badge>
      </div>

      {/* Response content */}
      {!response ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Brain className="w-12 h-12 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Generating assessment...</p>
          <Progress value={60} className="w-full max-w-xs" />
        </div>
      ) : (
        <div className="space-y-4">
          <RiskBadge
            level={response.risk}
            confidence={response.confidence}
            mode={response.mode}
          />

          <Card>
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-2">Clinical Summary</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {response.summary?.[0] ?? response.rationale ?? 'Assessment complete'}
              </p>
            </CardContent>
          </Card>

          {response.mode === 'offline_rules' && response.rule_id && (
            <OfflineRuleDetails ruleId={response.rule_id} />
          )}

          <NextStepsList steps={response.next_steps ?? []} />

          {showUpgradeBanner && (
            <UpgradeBanner onUpgrade={handleUpgrade} />
          )}
        </div>
      )}
    </div>
  );
}
