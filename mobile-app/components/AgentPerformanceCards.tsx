import React from 'react';
import { XStack, YStack, Text, Card } from 'tamagui';
import { Cpu, BarChart3 } from 'lucide-react-native';

interface AgentPerformanceCardsProps {
  performance: Record<string, { accuracy: number; cases: number }>;
}

const agentConfig: Record<string, { label: string; color: string; icon: typeof Cpu }> = {
  medgemma: { label: 'MedGemma 4B', color: '#3B82F6', icon: Cpu },
  asq3: { label: 'ASQ-3 Validator', color: '#10B981', icon: BarChart3 },
};

export function AgentPerformanceCards({ performance }: AgentPerformanceCardsProps) {
  const entries = Object.entries(performance);

  if (entries.length === 0) return null;

  return (
    <XStack space="$4" flexWrap="wrap">
      {entries.map(([key, data]) => {
        const config = agentConfig[key] ?? { label: key, color: '#64748B', icon: Cpu };
        const Icon = config.icon;
        return (
          <Card key={key} flex={1} minWidth={140} p="$4" bg="white" br="$4" elevate>
            <XStack ai="center" space="$3">
              <Icon size={24} color={config.color} />
              <YStack>
                <Text fontSize="$4" fontWeight="600" color="#1E293B">
                  {config.label}
                </Text>
                <Text fontSize="$6" fontWeight="800" color={config.color}>
                  {(data.accuracy * 100).toFixed(1)}%
                </Text>
                <Text fontSize="$2" color="#64748B">
                  {data.cases} cases
                </Text>
              </YStack>
            </XStack>
          </Card>
        );
      })}
    </XStack>
  );
}
