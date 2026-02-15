import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const RULE_DETAILS: Record<
  string,
  { title: string; description: string; accuracy: string; source: string }
> = {
  low_words: {
    title: 'Vocabulary Rule #L1',
    description: 'Triggered by <50 words at 24+ months',
    accuracy: '94% validated against ASQ-3',
    source: 'AAP Guidelines 2024',
  },
  no_walking: {
    title: 'Gross Motor Rule #GM1',
    description: 'Triggered by no walking at 18+ months',
    accuracy: '96% validated against ASQ-3',
    source: 'AAP Guidelines 2024',
  },
  no_pincer: {
    title: 'Fine Motor Rule #FM1',
    description: 'Triggered by no pincer grasp at 12+ months',
    accuracy: '92% validated against ASQ-3',
    source: 'AAP Guidelines 2024',
  },
  no_imitation: {
    title: 'Cognitive Rule #C1',
    description: 'Triggered by no imitation at 18+ months',
    accuracy: '90% validated against ASQ-3',
    source: 'AAP Guidelines 2024',
  },
  no_eye_contact: {
    title: 'Social Rule #S1',
    description: 'Triggered by no eye contact at 6+ months',
    accuracy: '91% validated against ASQ-3',
    source: 'AAP Guidelines 2024',
  },
};

interface OfflineRuleDetailsProps {
  ruleId?: string;
}

export function OfflineRuleDetails({ ruleId }: OfflineRuleDetailsProps) {
  if (!ruleId) return null;

  const details = RULE_DETAILS[ruleId];

  if (!details) return null;

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Rule-Based Assessment
          </span>
        </div>
        <p className="text-sm text-amber-800 dark:text-amber-200">{details.description}</p>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
          {details.accuracy} • {details.source}
        </p>
      </CardContent>
    </Card>
  );
}
