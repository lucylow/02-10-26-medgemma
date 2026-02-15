import React from 'react';
import { YStack, Text, Card } from 'tamagui';
import { LineChart } from './Charts';

interface ConfidenceTrendChartProps {
  data: Array<{ date: string; confidence: number }>;
}

export function ConfidenceTrendChart({ data }: ConfidenceTrendChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    confidencePct: d.confidence * 100,
  }));

  return (
    <Card bg="white" p="$6" br="$4" elevate>
      <Text fontSize="$7" fontWeight="800" mb="$4" color="#1E3A8A">
        Agent Confidence Trend
      </Text>

      {chartData.length > 0 ? (
        <YStack minHeight={180}>
          <LineChart
            data={chartData}
            xKey="date"
            yKey="confidencePct"
            color="#10B981"
            strokeWidth={2}
            showDots
            dotSize={5}
            yDomain={[0, 100]}
          />
        </YStack>
      ) : (
        <YStack h={120} jc="center" ai="center">
          <Text fontSize="$4" color="#64748B">
            No confidence data yet
          </Text>
        </YStack>
      )}
    </Card>
  );
}
