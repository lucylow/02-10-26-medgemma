import React from 'react';
import { View } from 'react-native';
import { YStack, XStack, Text, Card, Badge } from 'tamagui';

interface MilestoneHeatmapProps {
  data: Record<string, number>;
}

const domains = [
  { key: 'language', label: 'Language', color: '#10B981' },
  { key: 'motor', label: 'Motor', color: '#F59E0B' },
  { key: 'social', label: 'Social', color: '#8B5CF6' },
  { key: 'cognitive', label: 'Cognitive', color: '#3B82F6' },
];

function getHeatColor(percent: number): string {
  if (percent < 50) return '#EF4444';
  if (percent < 75) return '#F59E0B';
  return '#10B981';
}

export function MilestoneHeatmap({ data }: MilestoneHeatmapProps) {
  return (
    <Card bg="white" p="$6" br="$4" elevate>
      <Text fontSize="$7" fontWeight="800" mb="$4" color="#1E3A8A">
        ASQ-3 Milestone Progress
      </Text>

      <YStack space="$4">
        {domains.map(({ key, label, color }) => {
          const value = data[key] ?? 0;
          return (
            <XStack key={key} ai="center" space="$4">
              <Text fontSize="$4" fontWeight="600" flex={1} minWidth={80}>
                {label}
              </Text>
              <View style={{ flex: 2, height: 12, backgroundColor: '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${Math.min(100, Math.max(0, value))}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: 6,
                  }}
                />
              </View>
              <Badge size="$2" bg={`${color}30`} color={color}>
                {value.toFixed(0)}%
              </Badge>
            </XStack>
          );
        })}
      </YStack>

      <XStack mt="$4" space="$3" flexWrap="wrap">
        {[0, 25, 50, 75, 100].map((percent) => (
          <XStack key={percent} ai="center" space="$1">
            <View
              style={{
                width: 16,
                height: 8,
                borderRadius: 2,
                backgroundColor: getHeatColor(percent),
              }}
            />
            <Text fontSize="$2" color="#64748B">
              {percent}%
            </Text>
          </XStack>
        ))}
      </XStack>
    </Card>
  );
}
