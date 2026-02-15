import React from 'react';
import { View } from 'react-native';
import { XStack, Text, Card } from 'tamagui';
import { Brain, Shield, TrendingUp, Activity } from 'lucide-react-native';
import type { RiskSummary } from '@/hooks/useFhirCharts';

interface HeaderStatsProps {
  riskSummary: RiskSummary;
}

const statsConfig = [
  { label: 'Total Screens', valueKey: 'total', icon: Activity, color: '#1E3A8A' },
  { label: 'Low Risk', valueKey: 'low', icon: Shield, color: '#10B981' },
  { label: 'Monitor', valueKey: 'monitor', icon: TrendingUp, color: '#F59E0B' },
  { label: 'Needs Review', valueKey: 'needsReview', icon: Brain, color: '#EF4444' },
] as const;

export function HeaderStats({ riskSummary }: HeaderStatsProps) {
  const stats = statsConfig.map(({ label, valueKey, icon: Icon, color }) => {
    const value =
      valueKey === 'needsReview' ? riskSummary.elevated + riskSummary.discuss : riskSummary[valueKey];
    return { label, value, Icon, color };
  });

  return (
    <XStack space="$3" flexWrap="wrap">
      {stats.map(({ label, value, Icon, color }) => (
        <Card key={label} flex={1} minWidth={80} p="$4" bg={`${color}15`} br="$4">
          <XStack ai="center" space="$3">
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: `${color}25`,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon size={18} color={color} />
            </View>
            <YStack>
              <Text fontSize="$6" fontWeight="700" color={color}>
                {value}
              </Text>
              <Text fontSize="$3" color="#64748B">
                {label}
              </Text>
            </YStack>
          </XStack>
        </Card>
      ))}
    </XStack>
  );
}
