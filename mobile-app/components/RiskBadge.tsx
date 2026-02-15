/**
 * Risk badge for screening results - medical-grade styling.
 */

import React from 'react';
import { Badge, Text } from 'tamagui';

export type RiskLevel = 'low' | 'monitor' | 'elevated' | 'discuss';

interface RiskBadgeProps {
  risk: RiskLevel;
  size?: '$1' | '$2' | '$3';
  confidence?: number;
}

const RISK_STYLES: Record<RiskLevel, { bg: string; color: string }> = {
  low: { bg: '#D1FAE5', color: '#065F46' },
  monitor: { bg: '#FEF3C7', color: '#92400E' },
  elevated: { bg: '#FFEDD5', color: '#9A3412' },
  discuss: { bg: '#FEE2E2', color: '#991B1B' },
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'LOW',
  monitor: 'MONITOR',
  elevated: 'ELEVATED',
  discuss: 'DISCUSS',
};

export function RiskBadge({ risk, size = '$2', confidence }: RiskBadgeProps) {
  const style = RISK_STYLES[risk] ?? RISK_STYLES.monitor;

  return (
    <Badge size={size} bg={style.bg} color={style.color} fontWeight="700">
      <Text fontSize="$2" fontWeight="800" textTransform="uppercase">
        {RISK_LABELS[risk]}
      </Text>
      {confidence !== undefined && (
        <Text fontSize="$1" opacity={0.8} ml="$1">
          {Math.round(confidence * 100)}%
        </Text>
      )}
    </Badge>
  );
}
