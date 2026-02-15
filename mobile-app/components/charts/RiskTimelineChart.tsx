import React from 'react';
import { View } from 'react-native';
import { YStack, XStack, Text, Card, Badge } from 'tamagui';
import { LineChart, AreaChart } from './Charts';
import type { RiskTimelinePoint } from '@/hooks/useFhirCharts';

function getDomainColor(_domain: string): string {
  return '#3B82F6';
}

interface RiskTimelineChartProps {
  data: RiskTimelinePoint[];
  timeRangeLabel?: string;
}

const riskValues: Record<string, number> = {
  low: 1,
  monitor: 2,
  elevated: 3,
  discuss: 4,
};

export function RiskTimelineChart({ data, timeRangeLabel = '90 days' }: RiskTimelineChartProps) {
  const chartData = data.map((point) => ({
    date: point.date,
    riskScore: riskValues[point.risk] ?? 2,
    confidence: point.confidence * 100,
    domainColor: getDomainColor(point.domain),
  }));

  return (
    <Card bg="white" p="$6" br="$4" elevate>
      <XStack ai="center" space="$3" mb="$4">
        <Text fontSize="$7" fontWeight="800" color="#1E3A8A">
          Risk Timeline (ASQ-3)
        </Text>
        <Badge size="$2" bg="#10B981" color="white">
          {timeRangeLabel}
        </Badge>
      </XStack>

      <YStack space="$4" minHeight={220}>
        {chartData.length > 0 ? (
          <>
            <LineChart
              data={chartData}
              xKey="date"
              yKey="riskScore"
              color="#EF4444"
              strokeWidth={2}
              showDots
              dotSize={6}
              height={140}
              yDomain={[0.5, 4.5]}
            />
            <AreaChart
              data={chartData}
              xKey="date"
              yKey="confidence"
              color="#3B82F6"
              opacity={0.3}
              height={100}
              yDomain={[0, 100]}
            />
          </>
        ) : (
          <YStack h={180} jc="center" ai="center">
            <Text fontSize="$4" color="#64748B">
              No risk data in this range
            </Text>
          </YStack>
        )}

        <XStack jc="space-between" px="$2">
          <Text fontSize="$3" color="#64748B">
            Past
          </Text>
          <Text fontSize="$3" color="#64748B">
            Today
          </Text>
        </XStack>
      </YStack>

      <XStack ai="center" space="$6" mt="$4" flexWrap="wrap">
        <XStack ai="center" space="$2">
          <View style={{ width: 12, height: 3, backgroundColor: '#EF4444', borderRadius: 2 }} />
          <Text fontSize="$3" color="#64748B">
            Risk Level
          </Text>
        </XStack>
        <XStack ai="center" space="$2">
          <View style={{ width: 12, height: 3, backgroundColor: '#3B82F6', borderRadius: 2 }} />
          <Text fontSize="$3" color="#64748B">
            Confidence
          </Text>
        </XStack>
      </XStack>
    </Card>
  );
}
